/**
 * Sandbox-tool skills (ctx-execute, ctx-execute-file, ctx-batch-execute, ctx-fetch).
 *
 * These four skills front the tools that do the actual context saving, so the
 * contract worth pinning is not their prose but their accuracy: every tool they
 * name must really be registered, and every "there is no such CLI subcommand"
 * note must stay true if someone later adds one.
 */
import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { resolve, join } from "node:path";

const ROOT = resolve(import.meta.dirname, "../..");
const SKILLS_DIR = join(ROOT, "skills");
const SERVER_SOURCE = readFileSync(resolve(ROOT, "src/server.ts"), "utf-8");
const CLI_SOURCE = readFileSync(resolve(ROOT, "src/cli.ts"), "utf-8");

/** skill directory -> the MCP tool it fronts */
const SANDBOX_SKILLS: Array<[string, string]> = [
  ["ctx-execute", "ctx_execute"],
  ["ctx-execute-file", "ctx_execute_file"],
  ["ctx-batch-execute", "ctx_batch_execute"],
  ["ctx-fetch", "ctx_fetch_and_index"],
];

const read = (dir: string) => readFileSync(join(SKILLS_DIR, dir, "SKILL.md"), "utf-8");

describe("sandbox-tool skills", () => {
  for (const [dir, tool] of SANDBOX_SKILLS) {
    describe(dir, () => {
      it("has a SKILL.md whose name matches its directory", () => {
        expect(existsSync(join(SKILLS_DIR, dir, "SKILL.md"))).toBe(true);
        expect(read(dir)).toContain(`name: ${dir}`);
      });

      it("is user-invocable and declares a matching trigger", () => {
        const skill = read(dir);
        expect(skill).toContain("user-invocable: true");
        expect(skill).toContain(`Trigger: /context-mode:${dir}`);
      });

      it("prefers the MCP tool and names it before the trailing notes", () => {
        const skill = read(dir);
        expect(skill).toContain("MCP tool");
        const toolIdx = skill.indexOf(tool);
        const notesIdx = skill.indexOf("## Notes");
        expect(toolIdx).toBeGreaterThan(-1);
        expect(notesIdx).toBeGreaterThan(-1);
        expect(toolIdx).toBeLessThan(notesIdx);
      });

      it("documents a tool that is actually registered in the server", () => {
        // Tool registrations sit at two-space indent as `"ctx_name",`.
        expect(SERVER_SOURCE).toContain(`\n  "${tool}",`);
      });
    });
  }

  // The skills tell the model there is no CLI fallback for these tools. If a
  // subcommand ever lands, that note becomes a lie — fail here so the skill
  // gets updated alongside the CLI rather than drifting silently.
  it("only claims a CLI subcommand is missing while it really is", () => {
    const claimed = /There is no `context-mode ([a-z-]+)` CLI subcommand/g;
    const checked: string[] = [];
    for (const [dir] of SANDBOX_SKILLS) {
      for (const m of read(dir).matchAll(claimed)) {
        const sub = m[1];
        checked.push(`${dir}:${sub}`);
        expect(CLI_SOURCE).not.toContain(`args[0] === "${sub}"`);
      }
    }
    // Guard against the regex silently matching nothing after a reword.
    expect(checked.length).toBe(SANDBOX_SKILLS.length);
  });

  it("keeps the documented CLI subcommand list in sync with the dispatcher", () => {
    // ctx-fetch enumerates the real subcommands; each must exist in the CLI.
    const documented = ["index", "search", "doctor", "upgrade", "hook", "insight", "statusline"];
    const skill = read("ctx-fetch");
    for (const sub of documented) {
      expect(skill).toContain(`\`${sub}\``);
      expect(CLI_SOURCE).toContain(`args[0] === "${sub}"`);
    }
  });
});
