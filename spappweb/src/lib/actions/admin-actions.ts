"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdminSession } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";

function revalidateClient(userId: number) {
  revalidatePath("/inbox");
  revalidatePath(`/clientes/${userId}`);
}

async function assertAdmin() {
  await requireAdminSession();
  return createAdminClient();
}

export async function approveCredit(documentId: number, userId: number) {
  const supabase = await assertAdmin();
  const { error } = await supabase
    .from("users_documents")
    .update({
      estado_solicitud: "aceptada",
      hora_actualizacion: new Date().toISOString(),
    })
    .eq("id", documentId);

  if (error) throw new Error(error.message);
  revalidateClient(userId);
  return { ok: true };
}

const rejectSchema = z.object({
  documentId: z.number(),
  userId: z.number(),
  motivo: z.string().min(3, "Escribe un motivo de al menos 3 caracteres"),
  betado: z.boolean(),
});

export async function rejectCredit(input: z.infer<typeof rejectSchema>) {
  const parsed = rejectSchema.parse(input);
  const supabase = await assertAdmin();
  const { error } = await supabase
    .from("users_documents")
    .update({
      estado_solicitud: "rechazada",
      motivo_rechazo: parsed.motivo.trim(),
      betado: parsed.betado,
      hora_actualizacion: new Date().toISOString(),
    })
    .eq("id", parsed.documentId);

  if (error) throw new Error(error.message);
  revalidateClient(parsed.userId);
  return { ok: true };
}

const assignVisitSchema = z.object({
  visitaId: z.string().uuid(),
  userId: z.number(),
  visitadorId: z.number(),
  fechaProgramada: z.string().min(1),
});

export async function assignVisit(input: z.infer<typeof assignVisitSchema>) {
  const parsed = assignVisitSchema.parse(input);
  const supabase = await assertAdmin();
  const { error } = await supabase
    .from("visitas")
    .update({
      visitador_id: parsed.visitadorId,
      fecha_programada: parsed.fechaProgramada,
      estado: "asignada",
    })
    .eq("id", parsed.visitaId);

  if (error) throw new Error(error.message);
  revalidateClient(parsed.userId);
  return { ok: true };
}

export async function completeVisit(visitaId: string, userId: number) {
  const supabase = await assertAdmin();
  const { error } = await supabase
    .from("visitas")
    .update({ estado: "completada" })
    .eq("id", visitaId);

  if (error) throw new Error(error.message);
  revalidateClient(userId);
  return { ok: true };
}

export async function cancelVisit(visitaId: string, userId: number) {
  const supabase = await assertAdmin();
  const { error } = await supabase
    .from("visitas")
    .update({ estado: "cancelada" })
    .eq("id", visitaId);

  if (error) throw new Error(error.message);
  revalidateClient(userId);
  return { ok: true };
}

const paymentSchema = z.object({
  compraId: z.string().uuid(),
  userId: z.number(),
  field: z.enum(["inicial", "cuota"]),
  value: z.boolean(),
});

export async function confirmPayment(input: z.infer<typeof paymentSchema>) {
  const parsed = paymentSchema.parse(input);
  const supabase = await assertAdmin();
  const update =
    parsed.field === "inicial"
      ? { pago_inicial_confirmado: parsed.value }
      : { pago_cuota_confirmado: parsed.value };

  const { error } = await supabase
    .from("user_moto_compra")
    .update(update)
    .eq("id", parsed.compraId);

  if (error) throw new Error(error.message);
  revalidateClient(parsed.userId);
  return { ok: true };
}

const deliverySchema = z.object({
  compraId: z.string().uuid(),
  userId: z.number(),
  placa: z.string().min(1),
  chasis: z.string().min(1),
  referencia: z.string().optional(),
  fechaEntrega: z.string().min(1),
});

export async function updateDelivery(input: z.infer<typeof deliverySchema>) {
  const parsed = deliverySchema.parse(input);
  const supabase = await assertAdmin();
  const { error } = await supabase
    .from("user_moto_compra")
    .update({
      placa: parsed.placa.trim().toUpperCase(),
      chasis: parsed.chasis.trim(),
      referencia: parsed.referencia?.trim() || null,
      fecha_entrega: parsed.fechaEntrega,
    })
    .eq("id", parsed.compraId);

  if (error) throw new Error(error.message);
  revalidateClient(parsed.userId);
  return { ok: true };
}

export async function markDelivered(compraId: string, userId: number) {
  const supabase = await assertAdmin();
  const { error } = await supabase
    .from("user_moto_compra")
    .update({ estado: "entregada" })
    .eq("id", compraId);

  if (error) throw new Error(error.message);
  revalidateClient(userId);
  return { ok: true };
}

export async function cancelCompra(compraId: string, userId: number) {
  const supabase = await assertAdmin();
  const { error } = await supabase
    .from("user_moto_compra")
    .update({ estado: "cancelada" })
    .eq("id", compraId);

  if (error) throw new Error(error.message);
  revalidateClient(userId);
  return { ok: true };
}

export async function setTracking(
  userId: number,
  seguimiento: boolean,
) {
  const supabase = await assertAdmin();
  const { error } = await supabase
    .from("users_tracking")
    .update({ seguimiento })
    .eq("user_id", userId);

  if (error) throw new Error(error.message);
  revalidateClient(userId);
  return { ok: true };
}

const confirmTarifaSchema = z.object({
  tarifaId: z.string().uuid(),
  userId: z.number(),
  notas: z.string().optional(),
});

export async function confirmTarifaPago(
  input: z.infer<typeof confirmTarifaSchema>,
) {
  const parsed = confirmTarifaSchema.parse(input);
  const supabase = await assertAdmin();

  const { data: tarifa, error: fetchError } = await supabase
    .from("tarifas_pagadas")
    .select("id, monto_esperado, estado")
    .eq("id", parsed.tarifaId)
    .maybeSingle();

  if (fetchError) throw new Error(fetchError.message);
  if (!tarifa) throw new Error("Tarifa no encontrada.");
  if (tarifa.estado === "pagada") throw new Error("Esta tarifa ya está pagada.");

  const { error } = await supabase
    .from("tarifas_pagadas")
    .update({
      estado: "pagada",
      monto_pagado: tarifa.monto_esperado,
      pagada_at: new Date().toISOString(),
      confirmada_por: "admin",
      notas: parsed.notas?.trim() || null,
    })
    .eq("id", parsed.tarifaId);

  if (error) throw new Error(error.message);
  revalidateClient(parsed.userId);
  return { ok: true };
}

const resolveMorosoSchema = z.object({
  morosoId: z.string().uuid(),
  userId: z.number(),
});

export async function resolveMoroso(input: z.infer<typeof resolveMorosoSchema>) {
  const parsed = resolveMorosoSchema.parse(input);
  const supabase = await assertAdmin();

  const { count, error: countError } = await supabase
    .from("tarifas_pagadas")
    .select("id", { count: "exact", head: true })
    .eq("user_id", parsed.userId)
    .eq("estado", "vencida");

  if (countError) throw new Error(countError.message);
  if ((count ?? 0) > 0) {
    throw new Error(
      "Aún hay cuotas vencidas sin pagar. Confírmalas antes de regularizar.",
    );
  }

  const { error } = await supabase
    .from("morosos")
    .update({ estado: "regularizado" })
    .eq("id", parsed.morosoId);

  if (error) throw new Error(error.message);
  revalidateClient(parsed.userId);
  return { ok: true };
}

const createClientSchema = z.object({
  cedula: z
    .string()
    .trim()
    .min(5, "La cédula debe tener al menos 5 dígitos")
    .max(15, "La cédula no puede superar 15 dígitos")
    .regex(/^\d+$/, "La cédula solo puede contener números"),
});

export async function createClientUser(input: z.infer<typeof createClientSchema>) {
  const parsed = createClientSchema.parse(input);
  const supabase = await assertAdmin();
  const cedula = parsed.cedula;

  const { data: existingUser } = await supabase
    .from("users")
    .select("id")
    .eq("user", cedula)
    .maybeSingle();

  if (existingUser) {
    throw new Error("Ya existe un usuario con esa cédula.");
  }

  const { data: newUser, error } = await supabase
    .from("users")
    .insert({
      user: cedula,
      password: cedula,
      status: "normal",
    })
    .select("id, user")
    .single();

  if (error) throw new Error(error.message);

  revalidatePath("/clientes");
  revalidatePath("/inbox");
  return { ok: true, userId: newUser.id, username: newUser.user };
}

const visitadorSchema = z.object({
  id: z.number().optional(),
  nombre: z.string().min(2),
  telefono: z.string().optional(),
  fotoUrl: z.string().optional(),
  activo: z.boolean(),
  username: z.string().min(3).optional(),
  password: z.string().min(4).optional(),
});

export async function saveVisitador(input: z.infer<typeof visitadorSchema>) {
  const parsed = visitadorSchema.parse(input);
  const supabase = await assertAdmin();

  const payload = {
    nombre: parsed.nombre.trim(),
    telefono: parsed.telefono?.trim() || null,
    foto_url: parsed.fotoUrl?.trim() || null,
    activo: parsed.activo,
  };

  if (parsed.id) {
    const { data: existing, error: fetchError } = await supabase
      .from("visitadores")
      .select("user_id")
      .eq("id", parsed.id)
      .maybeSingle();

    if (fetchError) throw new Error(fetchError.message);

    if (parsed.password?.trim() && existing?.user_id) {
      const { error: pwdError } = await supabase
        .from("users")
        .update({ password: parsed.password.trim() })
        .eq("id", existing.user_id);
      if (pwdError) throw new Error(pwdError.message);
    }

    const { error } = await supabase
      .from("visitadores")
      .update(payload)
      .eq("id", parsed.id);
    if (error) throw new Error(error.message);
  } else {
    const username = parsed.username?.trim();
    const password = parsed.password?.trim();
    if (!username || !password) {
      throw new Error("Usuario y contraseña son obligatorios al crear visitador.");
    }

    const { data: existingUser } = await supabase
      .from("users")
      .select("id")
      .eq("user", username)
      .maybeSingle();

    if (existingUser) {
      throw new Error("Ese nombre de usuario ya existe.");
    }

    const { data: newUser, error: userError } = await supabase
      .from("users")
      .insert({
        user: username,
        password,
        status: "visitador",
      })
      .select("id")
      .single();

    if (userError) throw new Error(userError.message);

    const { error } = await supabase.from("visitadores").insert({
      ...payload,
      user_id: newUser.id,
    });
    if (error) throw new Error(error.message);
  }

  revalidatePath("/visitadores");
  revalidatePath("/inbox");
  return { ok: true };
}

export async function deleteVisitador(id: number) {
  const parsed = z.number().int().positive().parse(id);
  const supabase = await assertAdmin();

  const { data: visitador, error: fetchError } = await supabase
    .from("visitadores")
    .select("user_id")
    .eq("id", parsed)
    .maybeSingle();

  if (fetchError) throw new Error(fetchError.message);

  const { error } = await supabase
    .from("visitadores")
    .delete()
    .eq("id", parsed);
  if (error) throw new Error(error.message);

  if (visitador?.user_id) {
    await supabase.from("users").delete().eq("id", visitador.user_id);
  }

  revalidatePath("/visitadores");
  revalidatePath("/inbox");
  return { ok: true };
}

const bikeSchema = z.object({
  id: z.number().optional(),
  modelo: z.string().min(1),
  color: z.string().min(1),
  imagenUrl: z.string().optional(),
  stock: z.number().int().min(0),
  cuotaInicial: z.number().int().min(0),
  cuotaDiaria: z.number().int().min(0),
  descripcion: z.string().optional(),
  activo: z.boolean(),
});

export async function saveBike(input: z.infer<typeof bikeSchema>) {
  const parsed = bikeSchema.parse(input);
  const supabase = await assertAdmin();

  const payload = {
    modelo: parsed.modelo.trim(),
    color: parsed.color.trim(),
    imagen_url: parsed.imagenUrl?.trim() || null,
    stock: parsed.stock,
    cuota_inicial: parsed.cuotaInicial,
    cuota_diaria: parsed.cuotaDiaria,
    descripcion: parsed.descripcion?.trim() || null,
    activo: parsed.activo,
  };

  if (parsed.id) {
    const { error } = await supabase
      .from("bike_table")
      .update(payload)
      .eq("id", parsed.id);
    if (error) throw new Error(error.message);
  } else {
    const { error } = await supabase.from("bike_table").insert(payload);
    if (error) throw new Error(error.message);
  }

  revalidatePath("/catalogo");
  return { ok: true };
}

export async function deleteBike(id: number) {
  const supabase = await assertAdmin();
  const { error } = await supabase.from("bike_table").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/catalogo");
  return { ok: true };
}

const categoriaSchema = z.object({
  id: z.number().optional(),
  nombre: z.string().min(1),
  slug: z.string().min(1),
  descripcion: z.string().optional(),
  activo: z.boolean(),
  orden: z.number().int().min(0),
});

export async function saveCategoria(input: z.infer<typeof categoriaSchema>) {
  const parsed = categoriaSchema.parse(input);
  const supabase = await assertAdmin();
  const payload = {
    nombre: parsed.nombre.trim(),
    slug: parsed.slug.trim().toLowerCase(),
    descripcion: parsed.descripcion?.trim() || null,
    activo: parsed.activo,
    orden: parsed.orden,
  };
  if (parsed.id) {
    const { error } = await supabase
      .from("inventario_categorias")
      .update(payload)
      .eq("id", parsed.id);
    if (error) throw new Error(error.message);
  } else {
    const { error } = await supabase
      .from("inventario_categorias")
      .insert(payload);
    if (error) throw new Error(error.message);
  }
  revalidatePath("/inventario");
  return { ok: true };
}

export async function deleteCategoria(id: number) {
  const supabase = await assertAdmin();
  const { error } = await supabase
    .from("inventario_categorias")
    .delete()
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/inventario");
  return { ok: true };
}

const productoSchema = z.object({
  id: z.number().optional(),
  categoriaId: z.number().int().positive(),
  sku: z.string().min(1),
  nombre: z.string().min(1),
  descripcion: z.string().optional(),
  precio: z.number().int().min(0),
  stock: z.number().int().min(0),
  stockMinimo: z.number().int().min(0),
  imagenUrl: z.string().optional(),
  compatibleModelos: z.array(z.string()).optional(),
  activo: z.boolean(),
});

export async function saveProducto(input: z.infer<typeof productoSchema>) {
  const parsed = productoSchema.parse(input);
  const supabase = await assertAdmin();
  const payload = {
    categoria_id: parsed.categoriaId,
    sku: parsed.sku.trim().toUpperCase(),
    nombre: parsed.nombre.trim(),
    descripcion: parsed.descripcion?.trim() || null,
    precio: parsed.precio,
    stock: parsed.stock,
    stock_minimo: parsed.stockMinimo,
    imagen_url: parsed.imagenUrl?.trim() || null,
    compatible_modelos: parsed.compatibleModelos ?? [],
    activo: parsed.activo,
  };
  if (parsed.id) {
    const { error } = await supabase
      .from("inventario_productos")
      .update(payload)
      .eq("id", parsed.id);
    if (error) throw new Error(error.message);
  } else {
    const { error } = await supabase
      .from("inventario_productos")
      .insert(payload);
    if (error) throw new Error(error.message);
  }
  revalidatePath("/inventario");
  return { ok: true };
}

export async function deleteProducto(id: number) {
  const supabase = await assertAdmin();
  const { error } = await supabase
    .from("inventario_productos")
    .delete()
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/inventario");
  return { ok: true };
}

const updateSolicitudSchema = z.object({
  solicitudId: z.string().uuid(),
  estado: z.enum(["pendiente", "en_proceso", "completada", "cancelada"]),
  notasAdmin: z.string().optional(),
});

export async function updateSolicitudEstado(
  input: z.infer<typeof updateSolicitudSchema>,
) {
  const parsed = updateSolicitudSchema.parse(input);
  const supabase = await assertAdmin();
  const { error } = await supabase
    .from("solicitudes_taller")
    .update({
      estado: parsed.estado,
      notas_admin: parsed.notasAdmin?.trim() || null,
    })
    .eq("id", parsed.solicitudId);
  if (error) throw new Error(error.message);
  revalidatePath("/solicitudes");
  revalidatePath("/inbox");
  return { ok: true };
}

const garajeParqueaderoSchema = z.object({
  id: z.number().optional(),
  nombre: z.string().min(1),
  slug: z.string().min(1),
  activo: z.boolean(),
  orden: z.number().int().min(0),
});

export async function saveGarajeParqueadero(
  input: z.infer<typeof garajeParqueaderoSchema>,
) {
  const parsed = garajeParqueaderoSchema.parse(input);
  const supabase = await assertAdmin();
  const payload = {
    nombre: parsed.nombre.trim(),
    slug: parsed.slug.trim().toLowerCase(),
    activo: parsed.activo,
    orden: parsed.orden,
  };
  if (parsed.id) {
    const { error } = await supabase
      .from("garaje_parqueaderos")
      .update(payload)
      .eq("id", parsed.id);
    if (error) throw new Error(error.message);
  } else {
    const { error } = await supabase
      .from("garaje_parqueaderos")
      .insert(payload);
    if (error) throw new Error(error.message);
  }
  revalidatePath("/garaje");
  return { ok: true };
}

export async function deleteGarajeParqueadero(id: number) {
  const supabase = await assertAdmin();
  const { count, error: countError } = await supabase
    .from("garaje_motos")
    .select("id", { count: "exact", head: true })
    .eq("parqueadero_id", id);
  if (countError) throw new Error(countError.message);
  if ((count ?? 0) > 0) {
    throw new Error("No se puede eliminar: hay motos asignadas a este parqueadero.");
  }
  const { error } = await supabase
    .from("garaje_parqueaderos")
    .delete()
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/garaje");
  return { ok: true };
}

const garajeMotoSchema = z
  .object({
    id: z.string().uuid().optional(),
    parqueaderoId: z.number().int().positive().nullable(),
    placa: z.string().optional(),
    placaFotoUrl: z.string().optional(),
    referencia: z.string().min(1),
    modelo: z.string().min(1),
    color: z.string().min(1),
    origen: z.enum(["manual", "recuperacion"]),
    condicion: z.enum(["nueva", "segunda_mano", "recuperada"]),
    estado: z.enum(["en_garaje", "disponible", "vendida", "baja"]),
    notas: z.string().optional(),
    isNewManual: z.boolean().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.isNewManual && !data.placaFotoUrl?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "La foto de placa es obligatoria para registros manuales.",
        path: ["placaFotoUrl"],
      });
    }
  });

export async function saveGarajeMoto(input: z.infer<typeof garajeMotoSchema>) {
  const parsed = garajeMotoSchema.parse(input);
  const supabase = await assertAdmin();
  const payload = {
    parqueadero_id: parsed.parqueaderoId,
    placa: parsed.placa?.trim() || null,
    placa_foto_url: parsed.placaFotoUrl?.trim() || null,
    referencia: parsed.referencia.trim(),
    modelo: parsed.modelo.trim(),
    color: parsed.color.trim(),
    origen: parsed.origen,
    condicion: parsed.condicion,
    estado: parsed.estado,
    notas: parsed.notas?.trim() || null,
  };
  if (parsed.id) {
    const { error } = await supabase
      .from("garaje_motos")
      .update(payload)
      .eq("id", parsed.id);
    if (error) throw new Error(error.message);
  } else {
    const { error } = await supabase.from("garaje_motos").insert({
      ...payload,
      origen: parsed.origen ?? "manual",
    });
    if (error) throw new Error(error.message);
  }
  revalidatePath("/garaje");
  return { ok: true };
}

export async function deleteGarajeMoto(id: string) {
  const supabase = await assertAdmin();
  const { error } = await supabase.from("garaje_motos").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/garaje");
  return { ok: true };
}

const markMotoRecogidaSchema = z.object({
  recogerId: z.string().uuid(),
  userId: z.number(),
});

export async function markMotoRecogida(
  input: z.infer<typeof markMotoRecogidaSchema>,
) {
  const parsed = markMotoRecogidaSchema.parse(input);
  const supabase = await assertAdmin();

  const { data: existing, error: fetchError } = await supabase
    .from("motos_para_recoger")
    .select("id, estado")
    .eq("id", parsed.recogerId)
    .maybeSingle();
  if (fetchError) throw new Error(fetchError.message);
  if (!existing) throw new Error("Registro de recogida no encontrado.");
  if (existing.estado === "recogida") {
    throw new Error("Esta moto ya fue marcada como recogida.");
  }

  const { error } = await supabase
    .from("motos_para_recoger")
    .update({
      estado: "recogida",
      fecha_recogida: new Date().toISOString(),
    })
    .eq("id", parsed.recogerId);
  if (error) throw new Error(error.message);

  revalidatePath("/garaje");
  revalidateClient(parsed.userId);
  return { ok: true };
}
