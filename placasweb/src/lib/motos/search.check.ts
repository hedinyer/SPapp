import { findMotoExact, motoMatchesQuery, normalizeMotoQuery } from "./search.ts";

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

const catalog = [
  { id: "1", placa: "DXA96H", numero_serie: null },
  { id: "2", placa: null, numero_serie: "CH-12345" },
];
assert(findMotoExact(catalog, "dxa-96h")?.id === "1", "exacto por placa");
assert(findMotoExact(catalog, "CH12345")?.id === "2", "exacto por serie");
assert(findMotoExact(catalog, "DXA") === null, "parcial no es exacto");
assert(findMotoExact(catalog, "") === null, "vacío no busca");

console.log("search.check.ts: ok");
