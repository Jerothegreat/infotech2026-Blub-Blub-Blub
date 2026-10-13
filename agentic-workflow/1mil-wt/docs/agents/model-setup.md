# Model Setup: Cheaper Implementation Models

How to run this repository's workflow in Claude Code on a cheaper, Anthropic-compatible model. Which work each model may do is decided in `docs/agents/skill-policy.md` (Model Routing); this file only covers the connection.

Both providers below expose an Anthropic-compatible endpoint, so Claude Code needs only environment variables. Put them in the git-ignored `.claude/settings.local.json` under `env`, or in the shell you launch `claude` from. Never commit a key.

## OpenCode (GLM or DeepSeek)

OpenCode reads the repository's `AGENTS.md`, so the same rules apply there.

1. Add the provider once: run `opencode auth login` (or `/connect` inside OpenCode), choose DeepSeek or Z.ai, and paste the key. The key stays in OpenCode's local auth store, never in the repo.
2. Start `opencode` inside the ticket's worktree and pick the model with `/models` (DeepSeek V4 Flash or GLM Flash). Confirm the exact model ID in that list.
3. Paste the ticket's prompt from the plan's `handoff.md` (template: `templates/flash-prompt.md`).
4. Skills: OpenCode loads global skills from `~/.config/opencode/skills/<name>/SKILL.md`. Copy any kit skill there (for example `skills/grill-with-design`). Impeccable ships an OpenCode build: `npx impeccable install` in the project, or copy its `dist/opencode/.opencode` folder into the project.

Commands and paths change between OpenCode releases. If one differs, check the OpenCode docs and update this file.

## DeepSeek (V4 Flash)

Source: DeepSeek's Claude Code guide, <https://api-docs.deepseek.com/quick_start/agent_integrations/claude_code/>.

```json
{
  "env": {
    "ANTHROPIC_BASE_URL": "https://api.deepseek.com/anthropic",
    "ANTHROPIC_AUTH_TOKEN": "<DeepSeek API key>",
    "ANTHROPIC_MODEL": "deepseek-v4-flash",
    "ANTHROPIC_DEFAULT_HAIKU_MODEL": "deepseek-v4-flash",
    "CLAUDE_CODE_SUBAGENT_MODEL": "deepseek-v4-flash"
  }
}
```

DeepSeek maps unknown model names to `deepseek-v4-flash`, so a typo silently lands on Flash. Check the active model with `/model` at session start.

## Z.ai (GLM Flash)

Source: <https://claudelog.com/faqs/how-to-use-z-ai-in-claude-code/> and <https://apidog.com/blog/glm-5-3-flash-claude-code-cline/>.

```json
{
  "env": {
    "ANTHROPIC_BASE_URL": "https://api.z.ai/api/anthropic",
    "ANTHROPIC_AUTH_TOKEN": "<Z.ai API key>",
    "ANTHROPIC_MODEL": "glm-5.3-flash",
    "API_TIMEOUT_MS": "3000000"
  }
}
```

`glm-5.3-flash` comes from a third-party guide; confirm the exact ID in the Z.ai model list before relying on it.

## Gotchas

- Use `ANTHROPIC_AUTH_TOKEN`, not `ANTHROPIC_API_KEY`. Unset any exported Anthropic key: having both set produces errors that look like a bad key.
- Variables set in a shell profile are invisible to editors that do not load it. Check with `echo $env:ANTHROPIC_BASE_URL` (PowerShell) in the context that launches `claude`.
- Remove the `env` block (or the variables) to return to Claude models.
- Provider plans, prices, and model IDs change often; recheck the provider pages above when something stops working.
