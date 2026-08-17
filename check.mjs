/**
 * Verifies the landing page really does consume every token.
 *
 * "Used" is counted two ways, deliberately kept separate:
 *   - chrome    : referenced as var(--x) by styles.css / index.html, i.e. it
 *                 paints an actual piece of the landing page.
 *   - reference : painted by reference.js, which walks token-data.js and sets
 *                 background/colour from var(--x) for every entry.
 * Every token must land in at least one bucket, and every alias must resolve.
 */
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = dirname(fileURLToPath(import.meta.url));
const read = (p) => readFileSync(join(ROOT, p), "utf8");

const tokensJson = JSON.parse(read("sample-tokens.json"));
const tokensCss = read("docs/tokens.css");
const data = JSON.parse(read("docs/token-data.js").replace(/^[\s\S]*?window\.TOKENS = /, "").replace(/;\s*$/, ""));

const fail = [];
const check = (ok, msg) => { if (!ok) fail.push(msg); };

// 1. Every leaf token in the source file made it into the build.
const countLeaves = (node) =>
  node && typeof node === "object"
    ? "$value" in node
      ? 1
      : Object.values(node).reduce((n, v) => n + countLeaves(v), 0)
    : 0;
const sourceCount = countLeaves(tokensJson);
check(sourceCount === data.length, `token count drift: source ${sourceCount}, build ${data.length}`);

// 2. Every token declares a custom property, and every alias resolved.
const declared = new Set([...tokensCss.matchAll(/^\s*(--[a-z0-9-]+):/gm)].map((m) => m[1]));
for (const t of data) {
  check(declared.has(t.cssVar), `${t.path} has no custom property`);
  check(t.value !== undefined && t.value !== null, `${t.path} has no resolved value`);
  if (t.alias) check(/^#[0-9a-f]{6}$/i.test(t.value), `${t.path} alias ${t.alias.id} did not resolve to a hex`);
}
check(declared.size === data.length, `tokens.css declares ${declared.size} vars for ${data.length} tokens`);

// 3. Alias slots form one contiguous run over exactly the 43 primitives.
const slots = [...new Set(data.filter((t) => t.alias).map((t) => Number(t.alias.id.split(":").pop())))];
const primitives = data.filter((t) => t.group === "primitive");
check(primitives.length === 43, `expected 43 primitives, found ${primitives.length}`);
check(Math.min(...slots) >= 117 && Math.max(...slots) <= 159, `alias slots fall outside 117-159`);
const targets = new Set(data.filter((t) => t.alias).map((t) => t.alias.target));
check(
  [...targets].every((p) => primitives.some((t) => t.path === p)),
  `an alias resolved to something that is not a primitive`,
);

// 4. Usage.
const chromeSrc = read("docs/styles.css") + read("docs/index.html");
const chromeUsed = new Set([...chromeSrc.matchAll(/var\((--[a-z0-9-]+)\)/g)].map((m) => m[1]));
for (const v of chromeUsed) check(declared.has(v), `styles reference undeclared ${v}`);

const referenceRendered = /style\.background\s*=\s*"var\(" \+ t\.cssVar/.test(read("docs/reference.js"));
check(referenceRendered, "reference.js no longer paints swatches from custom properties");

const chrome = data.filter((t) => chromeUsed.has(t.cssVar));
const referenceOnly = data.filter((t) => !chromeUsed.has(t.cssVar));

console.log(
  [
    `source tokens          ${sourceCount}`,
    `custom properties      ${declared.size}`,
    `used in page chrome    ${chrome.length}  (${((chrome.length / data.length) * 100).toFixed(0)}%)`,
    `used in reference only ${referenceOnly.length}`,
    `alias slots referenced ${slots.length}/43`,
    "",
    referenceOnly.length
      ? "reference-only:\n  " +
        Object.entries(
          referenceOnly.reduce((a, t) => ((a[t.group] = (a[t.group] || 0) + 1), a), {}),
        )
          .map(([g, n]) => `${g}=${n}`)
          .join("  ")
      : "",
  ]
    .filter(Boolean)
    .join("\n"),
);

if (fail.length) {
  console.error("\nFAILED\n" + fail.map((f) => "  - " + f).join("\n"));
  process.exit(1);
}
console.log("\nOK — all " + data.length + " tokens declared, resolved, and rendered.");
