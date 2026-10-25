import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import assert from "node:assert/strict";

const dir = dirname(fileURLToPath(import.meta.url));
const file = resolve(dir, "../docs/agentics/oss-capabilities-20261025.json");
const registry = JSON.parse(readFileSync(file, "utf8"));

assert.equal(registry.defaultEnabled, false, "All capabilities must default off");
assert.equal(registry.productionApproved, false, "This registry must not approve production");
assert.equal(registry.preserveExistingAgenticsPR, 172);
assert.equal(registry.governance.defaultDeny, true);
assert.equal(registry.governance.tenantIsolation, true);
assert.equal(registry.governance.financialExecutionDisabled, true);
assert.equal(registry.governance.marketingPublishingDisabled, true);

const ids = new Set();
for (const tool of registry.tools || []) {
  assert.equal(typeof tool.id, "string");
  assert.match(tool.id, /^[a-z]+(?:[a-z0-9_.-]*[a-z0-9])$/);
  assert.ok(!ids.has(tool.id), "duplicate tool ID: " + tool.id);
  ids.add(tool.id);
  assert.equal(tool.enabled, false, "unsafe automatically enabled tool: " + tool.id);
  assert.equal(typeof tool.permission, "string", "missing permission");
  assert.match(tool.permission, /^[a-z0-9_.-]+$/);
  assert.ok(Array.isArray(tool.safety) && tool.safety.length > 0);
  assert.ok(["parser-prototype", "html-export-prototype", "research-only",
    "read-only-adapter-prototype", "reference-only", "blocked-licensing-review"].includes(tool.maturity));
  if (tool.id.includes("wallet") || tool.id.includes("trading") || tool.id.startsWith("risk.")) {
    assert.ok(tool.safety.includes("no-orders") ||
      tool.safety.includes("no-funds-movement") ||
      tool.safety.includes("no-broker-trades"));
  }
}
assert.equal(ids.size, 6, "expected six reviewed OSS capabilities");
console.log("PASS: OSS capability registry defaults disabled and scoped");
