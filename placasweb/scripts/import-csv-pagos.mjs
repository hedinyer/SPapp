import { readFileSync, writeFileSync } from "fs";

const csv = readFileSync("C:/Users/hedin/Downloads/data.csv", "utf8");

const TYPO = {
  DXZ78H: "DXY78H",
  DYA96H: "DXA96H",
  DUM40I: "DUM04I",
  "71337": "17337",
  "63428": "063428",
};

function normSerie(s) {
  const d = s.replace(/\D/g, "");
  if (!d) return s.toUpperCase();
  return d.padStart(6, "0");
}

function csvKey(placa) {
  const fixed = (TYPO[placa.toUpperCase()] || placa).toUpperCase().trim();
  if (/^[A-Z]{3}\d{2}[A-Z]$/.test(fixed)) return `placa:${fixed}`;
  const m = fixed.match(/(\d{5,6})$/);
  if (m) return `serie:${normSerie(m[1])}`;
  if (/^\d+$/.test(fixed)) return `serie:${normSerie(fixed)}`;
  return `serie:${fixed}`;
}

const csvMap = new Map();
for (const line of csv.split(/\r?\n/)) {
  const p = line.split(";");
  if (p.length < 10) continue;
  const num = p[0].trim();
  const placa = p[1].trim();
  if (!placa || placa === "PLACA" || Number.isNaN(Number(num))) continue;
  const pagos = p[8].trim();
  const aliado = p[9].trim();
  if (!pagos && !aliado) continue;
  const key = csvKey(placa);
  csvMap.set(key, {
    pagos: pagos ? parseInt(pagos, 10) : null,
    aliado: aliado || null,
    source: placa,
  });
}

const motosJson = process.argv[2];
if (!motosJson) {
  console.error("Usage: node import-csv-pagos.mjs <motos.json>");
  process.exit(1);
}

const motos = JSON.parse(readFileSync(motosJson, "utf8"));
const matched = [];
const unmatchedCsv = [...csvMap.entries()];
const unmatchedDb = [];

for (const moto of motos) {
  const placa = moto.placa?.trim().toUpperCase() || null;
  const serie = moto.numero_serie?.trim().toUpperCase() || null;
  const serieNorm = serie ? normSerie(serie) : null;

  let data = null;
  let matchKey = null;
  if (placa && csvMap.has(`placa:${placa}`)) {
    matchKey = `placa:${placa}`;
    data = csvMap.get(matchKey);
  } else if (placa && csvMap.has(`serie:${placa}`)) {
    matchKey = `serie:${placa}`;
    data = csvMap.get(matchKey);
  } else if (serieNorm && csvMap.has(`serie:${serieNorm}`)) {
    matchKey = `serie:${serieNorm}`;
    data = csvMap.get(matchKey);
  } else if (serie && csvMap.has(`placa:${serie}`)) {
    matchKey = `placa:${serie}`;
    data = csvMap.get(matchKey);
  }

  if (data) {
    matched.push({ id: moto.id, placa, serie, ...data, matchKey });
    unmatchedCsv.splice(
      unmatchedCsv.findIndex(([k]) => k === matchKey),
      1,
    );
  } else {
    unmatchedDb.push({
      id: moto.id,
      placa,
      serie,
      ident: placa || serie,
    });
  }
}

console.log("Matched:", matched.length);
console.log("Unmatched DB motos:", unmatchedDb.length);
console.log("Unmatched CSV rows:", unmatchedCsv.length);

if (unmatchedCsv.length) {
  console.log("\nCSV sin match en BD:");
  for (const [k, v] of unmatchedCsv) console.log(`  ${k} (${v.source}) pagos=${v.pagos} aliado=${v.aliado}`);
}

writeFileSync(
  "scripts/import-pagos-updates.json",
  JSON.stringify({ matched, unmatchedDb, unmatchedCsv: unmatchedCsv.map(([k, v]) => ({ key: k, ...v })) }, null, 2),
);

const sql = matched
  .map((m) => {
    const pagos = m.pagos === null ? "NULL" : m.pagos;
    const aliado = m.aliado ? `'${m.aliado.replace(/'/g, "''")}'` : "NULL";
    return `UPDATE public.motos SET pagos = ${pagos}, aliado = ${aliado} WHERE id = '${m.id}';`;
  })
  .join("\n");

writeFileSync("scripts/import-pagos-updates.sql", sql);
console.log("\nWrote scripts/import-pagos-updates.sql");
