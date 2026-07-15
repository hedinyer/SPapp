import { getDepartamentos, getMunicipios } from "colombia-territorial";

export const DEPARTAMENTO_DEFAULT = "Cundinamarca";
export const CIUDAD_DEFAULT = "Girardot";

export function listDepartamentos(): string[] {
  return getDepartamentos()
    .map((d) => d.nombre)
    .sort((a, b) => a.localeCompare(b, "es"));
}

export function listCiudades(departamento: string): string[] {
  if (!departamento) return [];
  return getMunicipios(departamento)
    .map((m) => m.nombre)
    .sort((a, b) => a.localeCompare(b, "es"));
}
