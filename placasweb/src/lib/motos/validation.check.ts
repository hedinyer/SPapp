import { motoCreateSchema } from "./validation.ts";

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message);
}

const placaOk = motoCreateSchema.safeParse({
  modo: "placa",
  placa: "ABC12D",
  numero_serie: "",
  condicion: "nueva",
  ubicacion: "parqueadero",
  notas: "",
  tieneFoto: true,
});
assert(placaOk.success, "placa válida debe pasar");

const serieOk = motoCreateSchema.safeParse({
  modo: "serie",
  placa: "",
  numero_serie: "CH-12345",
  condicion: "usada",
  ubicacion: "lavadero",
  notas: "",
  tieneFoto: true,
});
assert(serieOk.success, "serie válida debe pasar");

const sinFoto = motoCreateSchema.safeParse({
  modo: "placa",
  placa: "ABC12D",
  numero_serie: "",
  condicion: "nueva",
  ubicacion: "parqueadero",
  notas: "",
  tieneFoto: false,
});
assert(!sinFoto.success, "sin foto debe fallar");

const placaCorta = motoCreateSchema.safeParse({
  modo: "placa",
  placa: "AB1",
  numero_serie: "",
  condicion: "nueva",
  ubicacion: "parqueadero",
  notas: "",
  tieneFoto: true,
});
assert(!placaCorta.success, "placa corta debe fallar");

console.log("moto validation ok");
