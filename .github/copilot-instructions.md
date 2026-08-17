# FlowSync Context Instructions

FlowSync tracks every push to this repo and uses AI (Amazon Bedrock) to extract
what changed, why, what risks were flagged, and what tasks remain. Use the MCP
tools below to stay in sync with the project before and after every task.

## Before starting any task
1. Call `get_project_context` — returns the current project state: active features,
   recent decisions, open risks, and pending tasks across all branches.
2. If you need to answer a specific question (e.g. "why did we choose X?", "what
   are the security risks?"), call `search_context` with a natural language query.
   It defaults to searching the current git branch; pass `branch: "all"` to search
   across all branches.
3. To see what was pushed recently, call `get_recent_changes`.

## After a push lands
- When prompted by the FlowSync VS Code notification, call `log_context` ONCE.
- Provide: `reasoning` (why you made this change), `decision` (what was resolved),
  `risk` (anything that could go wrong), `tasks` (what still needs doing).
- `log_context` merges into the most recent push record if called within 30 minutes.
  After 30 minutes it creates a new orphaned record instead.
- Never call `log_context` during exploration or before work is committed and pushed.

## Tool reference
| Tool | When to use |
|------|-------------|
| `get_project_context` | Start of every task — full project state |
| `search_context` | Answering a specific question about the project |
| `get_recent_changes` | Reviewing what was pushed recently |
| `log_context` | Recording reasoning after a push |
| `get_events` | Listing raw push events for a project |
