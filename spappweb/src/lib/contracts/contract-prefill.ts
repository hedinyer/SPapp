import type { SupabaseClient } from "@supabase/supabase-js";
import {
  CIUDAD_DEFAULT,
  DEPARTAMENTO_DEFAULT,
  listCiudades,
} from "@/lib/colombia-locations";
import {
  parseHojaVidaForm,
  type HojaVidaFormData,
} from "@/lib/contracts/hoja-vida-schema";

export interface ContractClientPrefill {
  nombre: string;
  cedula: string;
  direccion: string;
  departamento: string;
  ciudad: string;
}

function hojaTieneDatos(hoja: HojaVidaFormData): boolean {
  return Boolean(hoja.nombre_completo.trim() && hoja.numero_identificacion.trim());
}

export function buildDireccionNotificaciones(hoja: HojaVidaFormData): string {
  const calle = hoja.direccion.trim();
  const barrio = hoja.barrio.trim();
  if (!calle) return "";
  if (!barrio) return calle;
  return `${calle}, barrio ${barrio}`;
}

function ciudadValida(departamento: string, ciudad: string): boolean {
  return listCiudades(departamento).includes(ciudad);
}

export function prefillFromHojaYContrato(
  hoja: HojaVidaFormData,
  contratoData: Record<string, unknown> | null | undefined,
): ContractClientPrefill {
  const depStored = String(contratoData?.departamento_contratante ?? "").trim();
  const ciudadStored = String(contratoData?.ciudad_contratante ?? "").trim();
  const dirStored = String(contratoData?.direccion_notificaciones ?? "").trim();

  const departamento =
    depStored && listCiudades(depStored).length > 0
      ? depStored
      : DEPARTAMENTO_DEFAULT;
  const ciudad =
    ciudadStored && ciudadValida(departamento, ciudadStored)
      ? ciudadStored
      : ciudadValida(departamento, CIUDAD_DEFAULT)
        ? CIUDAD_DEFAULT
        : (listCiudades(departamento)[0] ?? CIUDAD_DEFAULT);

  return {
    nombre: String(contratoData?.nombre_contratante ?? hoja.nombre_completo).trim(),
    cedula: String(
      contratoData?.cedula_contratante ?? hoja.numero_identificacion,
    ).trim(),
    direccion: dirStored || buildDireccionNotificaciones(hoja),
    departamento,
    ciudad,
  };
}

/** Hoja del contrato o, si viene vacía, la más reciente del mismo usuario. */
export async function resolveHojaVidaForContract(
  supabase: SupabaseClient,
  userId: number,
  contractHoja: Record<string, unknown> | null | undefined,
): Promise<HojaVidaFormData> {
  const local = parseHojaVidaForm(contractHoja ?? {});
  if (hojaTieneDatos(local)) return local;

  const { data: rows } = await supabase
    .from("digital_contracts")
    .select("hoja_vida_data")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false })
    .limit(8);

  for (const row of rows ?? []) {
    const hoja = parseHojaVidaForm(
      (row.hoja_vida_data as Record<string, unknown>) ?? {},
    );
    if (hojaTieneDatos(hoja)) return hoja;
  }

  return local;
}
