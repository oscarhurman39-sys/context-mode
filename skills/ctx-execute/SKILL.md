---
name: ctx-execute
description: |
  Run code in context-mode's sandbox so raw data never enters the conversation.
  Use when analysing, counting, filtering, comparing, parsing, or transforming data,
  when calling an API or CLI whose output may be large, or when running tests and builds.
  Program the analysis instead of reading the data — only stdout enters context.
  Trigger: /context-mode:ctx-execute
user-invocable: true
---

# Context Mode Execute

Run a script in the sandbox and return only what it prints.

The point is leverage, not obedience: reading 40 files into the conversation spends
context you need for reasoning later in the session. Writing 10 lines that read those
files and print the answer spends almost none. Same information, a fraction of the cost.

## Instructions

1. Prefer the `ctx_execute` MCP tool when it is available.
2. Pick `language` from: `javascript`, `typescript`, `python`, `shell`, `ruby`, `go`,
   `rust`, `php`, `perl`, `r`, `elixir`, `csharp`.
   - HTTP calls and JSON → `javascript` (native `fetch`, `JSON.parse`)
   - Data analysis, CSV, statistics → `python`
   - Pipes and text tools (`grep`, `awk`, `jq`) → `shell`
3. Write code that **derives the answer**, then prints it. Printing a dumped payload
   defeats the purpose — the data lands in context anyway.
4. Wrap risky calls in `try`/`catch` and handle `null`/`undefined`. Uncaught errors go to
   stderr and may surface more than you intended.
5. Pass `intent` when the output could be large. Above the auto-index threshold the
   response returns searchable section titles and previews instead of raw stdout; drill in
   with `ctx_search(queries: [...])`.
6. Use `timeout` (ms) for long builds, `cwd` for shell commands that need a directory, and
   `background: true` only for servers or daemons that must outlive the call.

```javascript
ctx_execute({
  language: "javascript",
  code: `
    const { execSync } = require('child_process');
    try {
      const out = execSync('npm test 2>&1', { encoding: 'utf8' });
      const fails = out.split('\\n').filter(l => /FAIL|✗|Error:/.test(l));
      console.log(fails.length ? fails.slice(0, 40).join('\\n') : 'all green');
    } catch (err) {
      console.log('test run failed: ' + (err.message || String(err)));
    }
  `,
  intent: "failing tests"
})
```

## When not to use it

- A single short command whose whole output you want verbatim (`git status` on a clean
  tree, `pwd`, `whoami`) — Bash is simpler.
- File mutations and navigation (`mkdir`, `mv`, `rm`, `cd`, git writes) — Bash is the
  right surface.
- A file you are about to **edit** — use the host's normal Read tool. context-mode is for
  analysis, not editing.

## Notes

- `background: true` scripts must stay alive until the timeout detaches them. Do not add
  a self-closing `setTimeout`. For a server-plus-request pattern, put both in one call.
- A deny policy screens code before it runs, for shell and non-shell languages alike. If a
  call is refused, read the reason and change the approach rather than retrying it.
- There is no `context-mode execute` CLI subcommand. If the MCP tools are unavailable, say
  so plainly and fall back to the host's own tools with output kept small.
