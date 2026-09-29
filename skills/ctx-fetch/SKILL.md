---
name: ctx-fetch
description: |
  Fetch one or many URLs and index them into context-mode's FTS5 knowledge base without raw
  HTML ever entering the conversation, then search the result. Use for looking up library
  or API documentation, reading a changelog or spec, or pulling several doc pages at once.
  Replaces curl, wget, and WebFetch for anything whose page body you do not need verbatim.
  Trigger: /context-mode:ctx-fetch
user-invocable: true
---

# Context Mode Fetch

Fetch and index web content, then retrieve only the sections you need.

Calls the `ctx_fetch_and_index` MCP tool. A documentation page is mostly navigation,
markup, and prose you will not read; fetching it into context spends thousands of tokens to
answer one question. Indexing it first means you pay for the answer instead of the page.

## Instructions

1. Prefer the `ctx_fetch_and_index` MCP tool when it is available.
2. Always pass a `source` label. It is how you scope the follow-up search, so make it
   specific (`"zod-v4"`, not `"docs"`). Cross-source contamination in results almost always
   traces back to a vague label.
3. For one page use `url` + `source`. For several, pass `requests` and set `concurrency`:

```javascript
ctx_fetch_and_index({
  requests: [
    { url: "https://raw.githubusercontent.com/colinhacks/zod/main/README.md", source: "zod" },
    { url: "https://react.dev/reference/react/useEffect",                     source: "react-useEffect" }
  ],
  concurrency: 5
})
```

4. Then search, batching every question into one call and scoping by `source`:

```javascript
ctx_search({ source: "zod", queries: ["transform pipe", "refine superRefine", "coerce"] })
```

5. Use **4–8** concurrency for stable I/O-bound batches. Lower it when the target host
   enforces a per-IP rate limit you cannot raise.
6. For anything hosted on GitHub, fetch the raw URL
   (`https://raw.githubusercontent.com/<org>/<repo>/<ref>/<path>`) rather than the rendered
   page — you index the content instead of the site chrome.

## Caching

Every fetch is cached on disk and reused for repeat calls inside the TTL window. The default
TTL is 24 hours.

- `ttl: <ms>` overrides it per call — raise it for stable specs that will not move.
- `ttl: 0` or `force: true` bypasses the cache when you need a guaranteed-fresh read.
- A cache hit skips both fetching and indexing and returns a freshness hint, so re-asking a
  question about an already-indexed page is close to free.

## Notes

- Use this for documentation you do not own. For local files use `ctx_index(path: ...)` or
  `ctx_execute_file` — fetching your own repo over HTTP is the wrong shape.
- Raw content is never echoed back; retrieve any section on demand with
  `ctx_search(source: "<label>")`.
- The fetch phase parallelises up to your chosen concurrency, but the FTS5 write phase is
  always serial because SQLite takes a single writer. Very large batches are bounded by
  index-write time, not network time.
- There is no `context-mode fetch` CLI subcommand — the CLI exposes `index`, `search`,
  `doctor`, `upgrade`, `hook`, `insight`, and `statusline` only. If the MCP tools are
  unavailable, say so rather than reaching for curl or wget.
