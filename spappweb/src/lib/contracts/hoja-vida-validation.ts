import type { HojaVidaFormData } from "@/lib/contracts/hoja-vida-schema";

export function isFullName(value: string): boolean {
  const words = value
    .trim()
    .split(/\s+/)
    .filter((w) => w.length > 0);
  return words.length >= 3;
}

const BIRTH_DATE_RE = /^(\d{2})\/(\d{2})\/(\d{4})$/;

/** Inserta / automáticamente mientras escribe (igual que la app móvil). */
export function formatBirthDateInput(value: string): string {
  const digits = value.replace(/\D/g, "");
  if (!digits) return "";

  let formatted = "";
  for (let i = 0; i < digits.length && i < 8; i++) {
    if (i === 2 || i === 4) formatted += "/";
    formatted += digits[i];
  }
  return formatted;
}

export function isValidBirthDate(value: string): boolean {
  const match = value.trim().match(BIRTH_DATE_RE);
  if (!match) return false;
  const year = Number(match[3]);
  return year >= 1900;
}

function referenciaComplete(r: { nombre: string; celular: string }): boolean {
  return isFullName(r.nombre) && r.celular.trim().length >= 10;
}

export function isHojaVidaComplete(form: HojaVidaFormData): boolean {
  if (!isFullName(form.nombre_completo)) return false;
  if (!form.tipo_identificacion) return false;
  if (form.numero_identificacion.trim().length === 0) return false;
  if (!isValidBirthDate(form.fecha_nacimiento)) return false;
  if (form.celular.trim().length < 10) return false;
  if (form.direccion.trim().length === 0 || form.barrio.trim().length === 0) {
    return false;
  }
  if (form.correo.trim().length === 0 || !form.correo.includes("@")) {
    return false;
  }
  if (form.trabaja_empresa == null) return false;
  if (form.trabaja_empresa === true) {
    if (form.nombre_empresa.trim().length === 0) return false;
  } else if (form.independiente !== true && form.habilidad.trim().length === 0) {
    return false;
  }
  if (!form.estado_civil) return false;
  if (form.estado_civil === "casado" || form.estado_civil === "union_libre") {
    if (
      !isFullName(form.nombre_conyuge) ||
      form.celular_conyuge.trim().length < 10
    ) {
      return false;
    }
  }
  return form.referencias.every(referenciaComplete);
}

export function blocksNewDocumentSubmission(doc: {
  estado_solicitud: string;
  betado: boolean;
} | null): string | null {
  if (!doc) return null;
  if (doc.estado_solicitud === "pendiente") {
    return "Ya tienes una solicitud en proceso.";
  }
  if (doc.estado_solicitud === "aceptada") {
    return "Tu solicitud ya fue aprobada.";
  }
  if (doc.estado_solicitud === "rechazada" && doc.betado) {
    return "No puedes volver a solicitar crédito.";
  }
  return null;
}

export function canResubmitDocument(doc: {
  estado_solicitud: string;
  betado: boolean;
}): boolean {
  return doc.estado_solicitud === "rechazada" && !doc.betado;
}

// ponytail: self-check mínimo
if (process.env.NODE_ENV !== "production") {
  const base: HojaVidaFormData = {
    nombre_completo: "Juan Perez Lopez",
    tipo_identificacion: "cc",
    numero_identificacion: "1234567890",
    fecha_nacimiento: "01/01/1990",
    celular: "3001234567",
    direccion: "Calle 1",
    barrio: "Centro",
    correo: "a@b.co",
    trabaja_empresa: true,
    nombre_empresa: "Empresa SA",
    telefono_empresa: "",
    direccion_empresa: "",
    independiente: null,
    habilidad: "",
    estado_civil: "soltero",
    nombre_conyuge: "",
    celular_conyuge: "",
    referencias: [
      { nombre: "Ana Maria Gomez", celular: "3009876543" },
      { nombre: "Pedro Luis Diaz", celular: "3011111111" },
    ],
  };
  console.assert(!isFullName("Juan Perez"), "nombre incompleto");
  console.assert(
    formatBirthDateInput("15031990") === "15/03/1990",
    "fecha con barras",
  );
  console.assert(isHojaVidaComplete(base), "formulario completo");
  console.assert(
    !isHojaVidaComplete({ ...base, trabaja_empresa: false, habilidad: "" }),
    "independiente sin habilidad",
  );
}
