import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

/** Checks que corren con strip-types (sin path aliases / sin server-only). */
const stripChecks = [
  "src/lib/contracts/hoja-vida.check.ts",
  "src/lib/pipeline/pipeline.check.ts",
  "src/lib/pipeline/mora-utils.check.ts",
  "src/lib/printing/inventario-export.check.ts",
];

/** Checks que necesitan tsx (+ stub server-only cuando aplica). */
const tsxChecks = [
  {
    file: "src/lib/contracts/contrato.check.ts",
    args: ["--yes", "tsx", "--import", "./scripts/stub-server-only.mjs"],
  },
  {
    file: "src/lib/contracts/regenerate-contrato-pdf.check.ts",
    args: ["--yes", "tsx"],
  },
];

function runNodeStrip(file) {
  return new Promise((resolve, reject) => {
    const child = spawn(
      process.execPath,
      ["--experimental-strip-types", file],
      { cwd: root, stdio: "inherit", shell: false },
    );
    child.on("exit", (code) => {
      if (code === 0) resolve(undefined);
      else reject(new Error(`${file} exited ${code}`));
    });
    child.on("error", reject);
  });
}

function runNpxTsx(file, prefixArgs) {
  return new Promise((resolve, reject) => {
    const child = spawn(
      "npx",
      [...prefixArgs, file],
      { cwd: root, stdio: "inherit", shell: true },
    );
    child.on("exit", (code) => {
      if (code === 0) resolve(undefined);
      else reject(new Error(`${file} exited ${code}`));
    });
    child.on("error", reject);
  });
}

const results = await Promise.allSettled([
  ...stripChecks.map(runNodeStrip),
  ...tsxChecks.map((c) => runNpxTsx(c.file, c.args)),
]);
const failed = results.filter((r) => r.status === "rejected");
if (failed.length > 0) {
  for (const f of failed) {
    if (f.status === "rejected") console.error(f.reason);
  }
  process.exit(1);
}

console.log("check:all OK");
