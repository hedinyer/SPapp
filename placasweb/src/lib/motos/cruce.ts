export type CruceViaduct = {
  vehiculo_id: number;
  placa_viaduct: string | null;
  serie_viaduct: string | null;
  propietario: string | null;
  marca: string | null;
  modelo: string | null;
  estado_vehiculo: string | null;
  veces_vendida: number;
  tarifas_pagadas: number;
  contrato_activo: {
    contrato_id: number;
    estado: string;
    cliente: string;
    cedula: string;
    fecha_inicio: string;
    tarifa: number | null;
  } | null;
};

export type CruceSpappweb = {
  compras: number;
  tarifas_pagadas: number;
  tarifas_total: number;
  estados_compra: string[];
};

export type CruceMotoEntry = {
  placa: string | null;
  numero_serie: string | null;
  placasweb: {
    pagos: number | null;
    aliado: string | null;
    veces_vendida: number | null;
  };
  viaduct: CruceViaduct | null;
  spappweb: CruceSpappweb | null;
};

export type CrucePeriodoPayload = {
  generado: string;
  periodo: { desde: string; hasta: string };
  resumen: {
    total: number;
    sin_viaduct: number;
    sin_spappweb: number;
  };
  motos: Record<string, CruceMotoEntry>;
};

export function resolveCruceDisplay(
  moto: { pagos: number | null; aliado: string | null; veces_vendida: number | null },
  cruce: CruceMotoEntry | undefined,
) {
  const v = cruce?.viaduct;
  const s = cruce?.spappweb;
  return {
    prenda:
      v?.propietario?.trim() ||
      moto.aliado?.trim() ||
      null,
    vecesVendida: v?.veces_vendida ?? moto.veces_vendida,
    tarifasViaduct: v?.tarifas_pagadas ?? moto.pagos,
    tarifasSpapp: s?.tarifas_pagadas ?? null,
    contratoActivo: v?.contrato_activo ?? null,
    sinViaduct: !v,
    marcaModelo:
      v?.marca && v?.modelo ? `${v.marca} ${v.modelo}`.trim() : null,
  };
}
