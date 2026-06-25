import assert from "node:assert";
import { planFifo, type FacturaPendiente } from "./fifo.ts";

const facturas: FacturaPendiente[] = [
  { id: 101, fecha: "2026-06-18", total: 41000, pagado: 0, saldo: 41000 },
  { id: 102, fecha: "2026-06-19", total: 41000, pagado: 0, saldo: 41000 },
  { id: 103, fecha: "2026-06-21", total: 41000, pagado: 0, saldo: 41000 },
];

// parcial: solo cubre parte de la mas antigua
let r = planFifo(facturas, 8000);
assert.strictEqual(r.plan.length, 1);
assert.strictEqual(r.plan[0].aplicar, 8000);
assert.strictEqual(r.sobrante, 0);

// reparto: dos completas + parcial en la tercera
r = planFifo(facturas, 100000);
assert.strictEqual(r.plan.length, 3);
assert.strictEqual(r.plan[0].aplicar, 41000);
assert.strictEqual(r.plan[2].aplicar, 18000);
assert.strictEqual(r.sobrante, 0);

// sobrante: excede todas las pendientes
r = planFifo(facturas, 200000);
assert.strictEqual(r.plan.length, 3);
assert.strictEqual(r.sobrante, 77000);

// sin facturas
r = planFifo([], 5000);
assert.strictEqual(r.plan.length, 0);
assert.strictEqual(r.sobrante, 5000);

console.log("fifo.check OK");
