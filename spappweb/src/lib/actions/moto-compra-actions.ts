"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { calcMotoPayment } from "@/lib/moto-payment";
import { createAdminClient } from "@/lib/supabase/admin";

const selectSchema = z.object({
  contractId: z.string().uuid(),
  bikeId: z.number().int().positive(),
  frecuencia: z.enum(["diario", "semanal", "quincenal", "mensual"]),
});

export async function selectMotoFromContract(input: z.infer<typeof selectSchema>) {
  const parsed = selectSchema.parse(input);
  const supabase = createAdminClient();

  const { data: contract, error: contractError } = await supabase
    .from("digital_contracts")
    .select("id, user_id, status")
    .eq("id", parsed.contractId)
    .maybeSingle();

  if (contractError) throw new Error(contractError.message);
  if (!contract) throw new Error("Enlace no válido.");
  if (contract.status !== "firmado") {
    throw new Error("Primero debes firmar el contrato.");
  }

  const userId = contract.user_id as number;

  const { data: existing } = await supabase
    .from("user_moto_compra")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle();

  if (existing) throw new Error("Ya registraste tu selección de moto.");

  const { data: bike, error: bikeError } = await supabase
    .from("bike_table")
    .select("id, modelo, color, stock, activo, cuota_inicial, cuota_diaria, monto_visita")
    .eq("id", parsed.bikeId)
    .maybeSingle();

  if (bikeError) throw new Error(bikeError.message);
  if (!bike || !bike.activo || bike.stock <= 0) {
    throw new Error("La moto seleccionada ya no está disponible.");
  }

  const payment = calcMotoPayment(bike, parsed.frecuencia);

  const { error: insertError } = await supabase.from("user_moto_compra").insert({
    user_id: userId,
    digital_contract_id: contract.id,
    bike_id: bike.id,
    modelo: bike.modelo,
    color: bike.color,
    frecuencia_pago: parsed.frecuencia,
    ...payment,
    estado: "pendiente_pago",
  });

  if (insertError) throw new Error(insertError.message);

  revalidatePath("/inbox");
  revalidatePath(`/clientes/${userId}`);
  revalidatePath(`/moto/${parsed.contractId}`);
  return { ok: true };
}
