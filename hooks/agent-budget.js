#!/usr/bin/env node
// agent-budget — PreToolUse hook for Agent tool circuit breaker.
//
// Tracks subagent invocations per session and denies further calls once
// the budget is exhausted. Resets on new session_id.
//
// Config:
//   CLAUDE_AGENT_BUDGET=N   override default total cap (default: 10)
//
// State:
//   ~/.claude/cache/agent-budget/{session_id}.json

const fs = require('fs');
const path = require('path');
const os = require('os');

const DEFAULT_BUDGET = 10;
const budget = Math.max(1, parseInt(process.env.CLAUDE_AGENT_BUDGET, 10) || DEFAULT_BUDGET);

const claudeDir = process.env.CLAUDE_CONFIG_DIR || path.join(os.homedir(), '.claude');
const stateDir = path.join(claudeDir, 'cache', 'agent-budget');

function allow() {
  process.stdout.write(JSON.stringify({
    hookSpecificOutput: {
      hookEventName: 'PreToolUse',
      permissionDecision: 'allow'
    }
  }));
  process.exit(0);
}

function deny(reason) {
  process.stdout.write(JSON.stringify({
    hookSpecificOutput: {
      hookEventName: 'PreToolUse',
      permissionDecision: 'deny',
      permissionDecisionReason: reason
    }
  }));
  process.exit(0);
}

let input = '';
process.stdin.on('data', chunk => { input += chunk; });
process.stdin.on('end', () => {
  let data;
  try {
    data = JSON.parse(input);
  } catch (e) {
    allow();
    return;
  }

  if (data.tool_name !== 'Agent') {
    allow();
    return;
  }

  const sessionId = data.session_id || 'unknown';
  const subagentType = (data.tool_input && data.tool_input.subagent_type) || 'general-purpose';

  let state = { total: 0, by_type: {}, first_at: null, last_at: null };
  const statePath = path.join(stateDir, `${sessionId}.json`);

  try {
    fs.mkdirSync(stateDir, { recursive: true });
    if (fs.existsSync(statePath)) {
      state = JSON.parse(fs.readFileSync(statePath, 'utf8'));
    }
  } catch (e) {
    // ignore read errors, treat as fresh state
  }

  if (state.total >= budget) {
    const byType = Object.entries(state.by_type)
      .map(([k, v]) => `${k}=${v}`)
      .join(', ');
    deny(
      `Agent budget exhausted: ${state.total}/${budget} this session (${byType}). ` +
      `Raise with CLAUDE_AGENT_BUDGET=N and restart, or do the work inline.`
    );
    return;
  }

  state.total += 1;
  state.by_type[subagentType] = (state.by_type[subagentType] || 0) + 1;
  const now = new Date().toISOString();
  if (!state.first_at) state.first_at = now;
  state.last_at = now;

  try {
    fs.writeFileSync(statePath, JSON.stringify(state, null, 2));
  } catch (e) {
    // ignore write errors, don't block on disk failure
  }

  allow();
});

// Safety: if stdin never closes, time out and allow after 2s
setTimeout(() => allow(), 2000).unref();
