import { motoMatchesQuery, normalizeMotoQuery } from "./search.ts";

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message);
}

assert(normalizeMotoQuery(" dxa-96h ") === "DXA96H", "normaliza placa");

assert(
  motoMatchesQuery({ placa: "DXA96H", numero_serie: null }, "dxa"),
  "match parcial por placa",
);
assert(
  motoMatchesQuery({ placa: null, numero_serie: "CH-12345" }, "ch123"),
  "match parcial por serie",
);
assert(
  !motoMatchesQuery({ placa: "DXA96H", numero_serie: null }, "ZZZ"),
  "sin match",
);
assert(
  motoMatchesQuery({ placa: "DXA96H", numero_serie: null }, "  "),
  "query vacío muestra todo",
);

console.log("search.check.ts: ok");
