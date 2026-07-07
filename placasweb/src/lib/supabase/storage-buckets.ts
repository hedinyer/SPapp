export const STORAGE_BUCKETS = {
  motoFotos: "moto-fotos",
} as const;

export type MotoImageBucket =
  (typeof STORAGE_BUCKETS)[keyof typeof STORAGE_BUCKETS];
