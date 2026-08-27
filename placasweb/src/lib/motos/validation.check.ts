import { motoCreateSchema } from "./validation.ts";
import { esInventariadaHoy, hoyBogota, isMotoUbicacion } from "./types.ts";

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message);
}

const placaOk = motoCreateSchema.safeParse({
  modo: "placa",
  placa: "ABC12D",
  numero_serie: "",
  condicion: "nueva",
  ubicacion: "bodega",
  notas: "",
  tieneFoto: true,
});
assert(placaOk.success, "placa válida debe pasar");

const serieOk = motoCreateSchema.safeParse({
  modo: "serie",
  placa: "",
  numero_serie: "CH-12345",
  condicion: "usada",
  ubicacion: "soluciones",
  notas: "",
  tieneFoto: true,
});
assert(serieOk.success, "serie válida debe pasar");

const sinFoto = motoCreateSchema.safeParse({
  modo: "placa",
  placa: "ABC12D",
  numero_serie: "",
  condicion: "nueva",
  ubicacion: "bera",
  notas: "",
  tieneFoto: false,
});
assert(!sinFoto.success, "sin foto debe fallar");

const placaCorta = motoCreateSchema.safeParse({
  modo: "placa",
  placa: "AB1",
  numero_serie: "",
  condicion: "nueva",
  ubicacion: "casa",
  notas: "",
  tieneFoto: true,
});
assert(!placaCorta.success, "placa corta debe fallar");

const legacyUbicacion = motoCreateSchema.safeParse({
  modo: "placa",
  placa: "ABC12D",
  numero_serie: "",
  condicion: "nueva",
  ubicacion: "parqueadero",
  notas: "",
  tieneFoto: true,
});
assert(!legacyUbicacion.success, "ubicación legacy debe fallar");

assert(isMotoUbicacion("bodega"), "bodega es ubicación válida");
assert(!isMotoUbicacion("lavadero"), "lavadero ya no es ubicación de UI");

const fixed = new Date("2026-08-27T18:00:00.000Z");
assert(hoyBogota(fixed) === "2026-08-27", "hoyBogota en zona Colombia");
assert(
  esInventariadaHoy({ inventariado_en: "2026-08-27" }, "2026-08-27"),
  "inventariada hoy",
);
assert(
  !esInventariadaHoy({ inventariado_en: "2026-08-26" }, "2026-08-27"),
  "ayer no cuenta",
);
assert(
  !esInventariadaHoy({ inventariado_en: null }, "2026-08-27"),
  "null no inventariada",
);

console.log("moto validation ok");
