import fs from "node:fs";
import { describe, it, expect } from "vitest";
import {
  withPreparedSessionCapabilityRead,
  createSubagentSessionStore,
} from "./subagent-session-store.js";

describe("mcp-http async read escapes prepared scope (issue #197810)", () => {
  it("async read of unprepared key inside retained scope throws", async () => {
    const tmpdir = "/tmp/ops-probe-" + Date.now();
    fs.mkdirSync(tmpdir + "/agents/probe/sessions", { recursive: true });
    try {
      const storePath = tmpdir + "/agents/probe/sessions/sessions.sqlite";
      const sessionKey = "agent:probe:dashboard:test-uuid";
      const probe = createSubagentSessionStore(storePath, "probe");

      // Exact shape of mcp-http.ts:247 — retained scope, async read of unprepared key
      // This reproduces the bug: the async catch in prepareCapabilityReads doesn't
      // catch the rejection from the inner async read.
      await expect(
        withPreparedSessionCapabilityRead(
          async () => {
            const entry = probe.get(sessionKey);
            return entry;
          },
          { retain: true },
        ),
      ).rejects.toThrow("requires worker preparation");
    } finally {
      fs.rmSync(tmpdir, { recursive: true, force: true });
    }
  });
});
