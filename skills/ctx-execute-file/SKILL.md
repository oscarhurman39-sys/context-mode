---
name: ctx-execute-file
description: |
  Analyse a single named file in context-mode's sandbox without reading it into context.
  Use for large logs, CSV/JSON/YAML data files, build output, test output, Playwright
  snapshots, or source files you want metrics from rather than edits to.
  The file arrives in the sandbox as FILE_CONTENT; only stdout enters the conversation.
  Trigger: /context-mode:ctx-execute-file
user-invocable: true
---

# Context Mode Execute File

Run code over one file's contents in the sandbox and return only the derived answer.

This is `ctx_execute` scoped to a named file. The file is read server-side and handed to
your code as `FILE_CONTENT`, so a 40 MB log costs you the size of your summary rather than
the size of the log.

## Instructions

1. Prefer the `ctx_execute_file` MCP tool when it is available.
2. Pass `path` (the file to read) plus `language` and `code`. Do not also read the file
   yourself first — that is the cost this tool exists to avoid.
3. Reference the contents as `FILE_CONTENT`. It is pre-loaded; there is no need to open the
   path from inside your code.
4. Print findings with specifics — line numbers, ids, exact values — not just counts. A
   summary that says "12 errors" sends you back for a second call; one that names them
   does not.
5. Pass `intent` when the printed result could still be large, then retrieve sections with
   `ctx_search(queries: [...])`.
6. Use `timeout` (ms) for very large files or expensive parsing.

```javascript
ctx_execute_file({
  path: "logs/access.log",
  language: "javascript",
  code: `
    const lines = FILE_CONTENT.split('\\n');
    const fives = lines.filter(l => / 5\\d\\d /.test(l));
    const paths = {};
    for (const l of fives) {
      const m = l.match(/"[A-Z]+ ([^ "?]+)/);
      if (m) paths[m[1]] = (paths[m[1]] || 0) + 1;
    }
    console.log(\`\${lines.length} lines, \${fives.length} 5xx\`);
    Object.entries(paths).sort((a, b) => b[1] - a[1]).slice(0, 10)
      .forEach(([p, n]) => console.log(\`\${n}  \${p}\`));
  `,
  intent: "5xx errors by path"
})
```

```python
# Python receives the same pre-loaded FILE_CONTENT string.
import json
data = json.loads(FILE_CONTENT)
bad = [r for r in data if not r.get("customer")]
print(f"{len(data)} records, {len(bad)} missing customer")
for r in bad[:10]:
    print(r["id"])
```

## When not to use it

- The file is one you are about to **edit** — use the host's normal Read tool so you can
  match exact strings.
- The file is tiny and you want every byte verbatim — reading it directly is simpler.
- You need several files at once — use `ctx_execute` and walk them with `fs`, or
  `ctx_index(path: ...)` followed by `ctx_search`.

## Notes

- `path` is contained to the project boundary. A path that escapes it is refused, so an
  approval for this tool cannot be used to reach unrelated parts of the filesystem.
- A file-path deny policy also applies; if a call is refused, read the reason rather than
  retrying the same path.
- There is no `context-mode execute-file` CLI subcommand. If the MCP tools are unavailable,
  say so rather than silently reading the whole file into context.
