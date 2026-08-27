import { z } from "zod";

export const motoCondicionSchema = z.enum(["nueva", "usada"]);

export const motoUbicacionSchema = z.enum([
  "soluciones",
  "bera",
  "casa",
  "bodega",
]);

export const motoCreateSchema = z
  .object({
    modo: z.enum(["placa", "serie"]),
    placa: z.string().trim(),
    numero_serie: z.string().trim(),
    condicion: motoCondicionSchema,
    ubicacion: motoUbicacionSchema,
    notas: z.string().trim().optional(),
    pagos: z.coerce.number().int().min(0).optional().nullable(),
    aliado: z.string().trim().optional(),
    veces_vendida: z.coerce.number().int().min(0).optional().nullable(),
    tieneFoto: z.boolean(),
  })
  .superRefine((data, ctx) => {
    if (!data.tieneFoto) {
      ctx.addIssue({
        code: "custom",
        message: "La foto es obligatoria.",
        path: ["tieneFoto"],
      });
    }

    if (data.modo === "placa") {
      if (data.placa.length < 5) {
        ctx.addIssue({
          code: "custom",
          message: "Indica una placa válida (mín. 5 caracteres).",
          path: ["placa"],
        });
      }
      return;
    }

    if (data.numero_serie.length < 3) {
      ctx.addIssue({
        code: "custom",
        message: "Indica un número de serie válido.",
        path: ["numero_serie"],
      });
    }
  });

export function duplicateMotoMessage(error: { code?: string; message?: string }): string | null {
  if (error.code === "23505") {
    if (error.message?.includes("motos_placa_unique")) {
      return "Ya existe una moto con esa placa.";
    }
    if (error.message?.includes("motos_serie_unique")) {
      return "Ya existe una moto con ese número de serie.";
    }
    return "Ya existe una moto con ese identificador.";
  }
  return null;
}
