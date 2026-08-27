#!/bin/bash
set -euo pipefail
input=$(cat)
tool_name=$(jq -r '.tool_name' <<<"$input")
content=$(jq -r '.tool_input.command // .tool_input.content // empty' <<<"$input")

[[ -z "$content" ]] && exit 0
[[ "$tool_name" =~ ^(Bash|Write|Edit)$ ]] || exit 0

# secret scan
if ! echo "$content" | gitleaks detect --pipe --no-banner >/dev/null 2>&1; then
  jq -n --arg reason "Blocked: possible secret detected by gitleaks" \
    '{hookSpecificOutput:{hookEventName:"PreToolUse",permissionDecision:"deny",permissionDecisionReason:$reason}}'
  exit 0
fi

# PII scan
# URL recognizer is excluded: known false-positive source on any "word.word"
# token (filenames, package names) — see microsoft/presidio#1498
PII_SCORE_THRESHOLD=0.6
pii_matches=$(curl -s --max-time 3 -X POST localhost:5001/analyze \
  -H "Content-Type: application/json" \
  -d "$(jq -n --arg text "$content" '{text:$text, language:"en"}')" \
  | jq --arg threshold "$PII_SCORE_THRESHOLD" \
    '[.[] | select(.entity_type != "URL" and .score >= ($threshold | tonumber))]' 2>/dev/null || echo '[]')

if [[ "$(jq 'length' <<<"$pii_matches" 2>/dev/null || echo 0)" -gt 0 ]]; then
  entity_types=$(jq -r '[.[].entity_type] | unique | join(", ")' <<<"$pii_matches")
  jq -n --arg reason "Blocked: possible PII detected by Presidio ($entity_types)" \
    '{hookSpecificOutput:{hookEventName:"PreToolUse",permissionDecision:"deny",permissionDecisionReason:$reason}}'
  exit 0
fi

exit 0
