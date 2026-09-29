---
name: ctx-batch-execute
description: |
  Run many shell commands in one sandboxed call, auto-index every output, and return only
  the sections matching your questions. Use when gathering context from several sources at
  once — multiple gh/git/docker/kubectl/aws queries, several log files, a survey of a
  codebase — instead of making one tool call per command.
  Trigger: /context-mode:ctx-batch-execute
user-invocable: true
---

# Context Mode Batch Execute

Gather from many commands in one call and read back only the matched windows.

One `ctx_batch_execute` replaces a run of separate calls. Each command's output is labelled
and indexed server-side; when you pass `queries`, the response carries the matching windows
rather than the full output of anything.

## Instructions

1. Prefer the `ctx_batch_execute` MCP tool when it is available.
2. Give every command a short `label` — it becomes the section header you search against,
   so make it descriptive (`"open PRs"`, not `"cmd1"`).
3. Pass `queries` as an array holding **all** your questions at once. Without queries you
   get the section list; with them you get the answers.
4. Set `concurrency` deliberately:
   - **4–8** for I/O-bound work — network calls, API queries, independent remote lookups.
   - **1** for CPU-bound work (`npm test`, builds, lint) and for commands sharing state —
     ports, lock files, writes to the same repo. Parallelism there causes flakes, not speed.
   - Cap at **4** for GitHub `gh` calls so you stay inside the API rate limit.
5. Leave `query_scope` at its default `"batch"` to search only this batch's output. Use
   `"global"` when the answer may live in something indexed earlier in the session.
6. Use `cwd` when the commands need a working directory, and `timeout` (ms) for slow ones.

```javascript
ctx_batch_execute({
  commands: [
    { label: "open PRs",      command: "gh pr list --json number,title,reviewDecision" },
    { label: "failing checks", command: "gh run list --status failure --limit 20" },
    { label: "recent commits", command: "git log --oneline -30" }
  ],
  queries: ["review pending", "failing workflow", "commits touching hooks"],
  concurrency: 3
})
```

## Concurrency, honestly

At `concurrency > 1` each command gets its own timeout budget. At `concurrency: 1` there is
a single shared budget and a timeout cascades — later commands are skipped. Pick the shape
you actually want; the faster setting is not always the safer one.

## Notes

- Do not narrow output inside the commands themselves (`| head -20`). `ctx_batch_execute`
  captures and `ctx_search` filters; trimming upstream throws away data the index never
  sees, so a follow-up question cannot be answered without re-running.
- Raw output is never echoed back in full, so a command that prints megabytes is safe here
  in a way it is not in Bash.
- There is no `context-mode batch` CLI subcommand. If the MCP tools are unavailable, say so
  rather than firing the commands one at a time through Bash.
