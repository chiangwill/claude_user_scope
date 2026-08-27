#!/bin/bash
set -euo pipefail
HOOK_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
GITLEAKS_CONFIG="$HOOK_DIR/gitleaks-allowlist.toml"
PII_ALLOWLIST="$HOOK_DIR/pii-allowlist.txt"

# Machine-local on/off switch. This file lives outside the synced dotclaude
# repo, so cloning dotclaude on another machine does not turn this on there.
[[ -f "$HOME/.claude/pii-guard-enabled" ]] || exit 0

input=$(cat)
tool_name=$(jq -r '.tool_name' <<<"$input")
content=$(jq -r '.tool_input.command // .tool_input.content // empty' <<<"$input")

[[ -z "$content" ]] && exit 0
[[ "$tool_name" =~ ^(Bash|Write|Edit)$ ]] || exit 0

# secret scan
# Confirmed false positives go in gitleaks-allowlist.toml, not here.
gitleaks_args=(detect --pipe --no-banner)
[[ -f "$GITLEAKS_CONFIG" ]] && gitleaks_args+=(-c "$GITLEAKS_CONFIG")
if ! echo "$content" | gitleaks "${gitleaks_args[@]}" >/dev/null 2>&1; then
  jq -n --arg reason "Blocked: possible secret detected by gitleaks" \
    '{hookSpecificOutput:{hookEventName:"PreToolUse",permissionDecision:"deny",permissionDecisionReason:$reason}}'
  exit 0
fi

# PII scan
# URL recognizer is excluded: known false-positive source on any "word.word"
# token (filenames, package names) — see microsoft/presidio#1498
# All other entity types (including NER ones like PERSON/LOCATION) stay on by
# default; confirmed false positives go in pii-allowlist.txt, not here.
PII_SCORE_THRESHOLD=0.6
pii_matches=$(curl -s --max-time 3 -X POST localhost:5001/analyze \
  -H "Content-Type: application/json" \
  -d "$(jq -n --arg text "$content" '{text:$text, language:"en"}')" \
  | jq --arg threshold "$PII_SCORE_THRESHOLD" \
    '[.[] | select(.entity_type != "URL" and .score >= ($threshold | tonumber))]' 2>/dev/null || echo '[]')

if [[ -f "$PII_ALLOWLIST" ]]; then
  allow_re=$( (grep -vE '^[[:space:]]*(#|$)' "$PII_ALLOWLIST" || true) | paste -sd'|' -)
else
  allow_re=""
fi

pii_matches=$(jq --arg content "$content" --arg re "$allow_re" '
  map(. + {matched: $content[.start:.end]})
  | if ($re | length) > 0 then map(select((.matched | test($re)) | not)) else . end
' <<<"$pii_matches")

if [[ "$(jq 'length' <<<"$pii_matches" 2>/dev/null || echo 0)" -gt 0 ]]; then
  entity_types=$(jq -r '[.[].entity_type] | unique | join(", ")' <<<"$pii_matches")
  jq -n --arg reason "Blocked: possible PII detected by Presidio ($entity_types)" \
    '{hookSpecificOutput:{hookEventName:"PreToolUse",permissionDecision:"deny",permissionDecisionReason:$reason}}'
  exit 0
fi

exit 0
