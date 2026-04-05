# Local Codex Agents

This directory installs a repo-local subset of agents from `/home/shadowweaver/awesome-codex-subagents`.

Why this subset:
- The project is a Next.js 16.2.2 App Router app under `src/app`.
- It uses React 19.2.4, TypeScript, Tailwind CSS 4, `next-auth` v5 beta, and direct Neon SQL access.
- The selected agents cover the highest-probability work in this repo: Next/App Router changes, frontend issues, route-handler/backend work, auth/security review, code mapping, and regression checks.

Installed agents:
- `nextjs-developer` - locally overridden for this repo's Next 16 + App Router + auth/data rules
- `backend-developer` - locally overridden for route handlers, auth, and direct SQL paths
- `security-auditor` - locally overridden for credentials auth and server-side data/security review
- `react-specialist`
- `typescript-pro`
- `reviewer`
- `ui-fixer`
- `browser-debugger`
- `code-mapper`
- `test-automator`
- `accessibility-tester`

Notes:
- Project-local agents in `.codex/agents/` take precedence over same-named global agents.
- `browser-debugger` expects a Chrome DevTools MCP server at `http://localhost:3000/mcp`.
- The local `nextjs-developer` override intentionally instructs the agent to read `node_modules/next/dist/docs/` before writing Next-specific code, matching this repo's `AGENTS.md`.
