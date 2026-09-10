import type { RecuperacionMarker } from "@/lib/pipeline/recuperacion-display";
import {
  getRecuperacionMarker,
  recuperacionMarkerLabel,
} from "@/lib/pipeline/recuperacion-display";

function assert(cond: unknown, msg: string) {
  if (!cond) throw new Error(msg);
}

assert(
  getRecuperacionMarker({
    estadoFisico: "activa",
    garajeEstado: "retenida",
    vecesRecuperada: 1,
  })?.kind === "retenida",
  "garage retenida → RECUPERADA",
);
assert(
  getRecuperacionMarker({
    estadoFisico: "recogida",
    vecesRecuperada: 0,
  })?.kind === "retenida",
  "estado_fisico recogida → RECUPERADA",
);
assert(
  getRecuperacionMarker({
    estadoFisico: "activa",
    recogerRetenida: true,
    vecesRecuperada: 1,
  })?.kind === "retenida",
  "recoger retenida → RECUPERADA",
);
const dev = getRecuperacionMarker({
  estadoFisico: "activa",
  vecesRecuperada: 2,
});
assert(dev?.kind === "devuelta" && dev.veces === 2, "devuelta N veces");
assert(
  recuperacionMarkerLabel({ kind: "devuelta", veces: 1 }) ===
    "Recuperada 1 vez · Devuelta al comprador",
  "label 1 vez",
);
assert(
  recuperacionMarkerLabel({ kind: "retenida" } satisfies RecuperacionMarker) ===
    "RECUPERADA",
  "label retenida",
);
assert(
  getRecuperacionMarker({ estadoFisico: "activa", vecesRecuperada: 0 }) ===
    null,
  "sin historial → null",
);

console.log("recuperacion-display.check ok");
