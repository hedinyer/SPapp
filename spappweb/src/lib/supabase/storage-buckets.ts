/** Buckets de Storage en Supabase (nombres reales del proyecto). */
export const STORAGE_BUCKETS = {
  visitadorFotos: "visitador-fotos",
  visitaEvidencias: "visita-evidencias",
  bikeImages: "bike-images",
  inventarioImagenes: "inventario-imagenes",
} as const;

export type AdminImageBucket =
  (typeof STORAGE_BUCKETS)[keyof typeof STORAGE_BUCKETS];
