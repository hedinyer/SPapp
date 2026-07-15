import Module from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const stub = path.join(path.dirname(fileURLToPath(import.meta.url)), "empty-stub.cjs");
const orig = Module._resolveFilename;
Module._resolveFilename = function (request, parent, isMain, options) {
  if (request === "server-only") return stub;
  return orig.call(this, request, parent, isMain, options);
};
