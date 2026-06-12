"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { ImagePlus, X } from "lucide-react";
import { uploadAdminImage } from "@/lib/actions/upload-image";
import type { AdminImageBucket } from "@/lib/supabase/storage-buckets";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

interface ImageFileFieldProps {
  label?: string;
  existingUrl?: string | null;
  file: File | null;
  onFileChange: (file: File | null) => void;
  disabled?: boolean;
}

export function ImageFileField({
  label = "Foto",
  existingUrl,
  file,
  onFileChange,
  disabled,
}: ImageFileFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);

  useEffect(() => {
    if (!file) {
      setPreview(null);
      return;
    }
    const objectUrl = URL.createObjectURL(file);
    setPreview(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [file]);

  const displayUrl = preview ?? existingUrl ?? null;

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
        <div className="relative h-28 w-28 shrink-0 overflow-hidden rounded-lg border border-neutral-200 bg-neutral-50">
          {displayUrl ? (
            <Image
              src={displayUrl}
              alt="Vista previa"
              fill
              className="object-cover"
              unoptimized
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-neutral-400">
              <ImagePlus className="h-8 w-8" strokeWidth={1.5} />
            </div>
          )}
        </div>
        <div className="flex flex-1 flex-col gap-2">
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            disabled={disabled}
            onChange={(e) => {
              const selected = e.target.files?.[0] ?? null;
              onFileChange(selected);
            }}
          />
          <Button
            type="button"
            variant="outline"
            disabled={disabled}
            onClick={() => inputRef.current?.click()}
          >
            Elegir desde mi PC
          </Button>
          {file && (
            <div className="flex items-center gap-2 text-sm text-neutral-600">
              <span className="truncate">{file.name}</span>
              <button
                type="button"
                className="text-neutral-400 hover:text-black"
                disabled={disabled}
                onClick={() => {
                  onFileChange(null);
                  if (inputRef.current) inputRef.current.value = "";
                }}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}
          {!file && existingUrl && (
            <p className="text-xs text-neutral-500">
              Imagen actual guardada. Elige otra para reemplazarla.
            </p>
          )}
          <p className="text-xs text-neutral-500">JPG, PNG o WebP · máx. 5 MB</p>
        </div>
      </div>
    </div>
  );
}

export async function uploadImageFile(
  bucket: AdminImageBucket,
  folder: string,
  file: File,
): Promise<string> {
  const formData = new FormData();
  formData.set("bucket", bucket);
  formData.set("folder", folder);
  formData.set("file", file);

  const { publicUrl } = await uploadAdminImage(formData);
  return publicUrl;
}

function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

export function visitadorUploadFolder(
  visitadorId: number | undefined,
  nombre: string,
): string {
  const slug = slugify(nombre) || "visitador";
  return visitadorId
    ? `visitadores/${visitadorId}-${slug}`
    : `visitadores/nuevo-${slug}-${Date.now()}`;
}

export function bikeUploadFolder(modelo: string, color: string): string {
  const slug = slugify(`${modelo}-${color}`) || "moto";
  return `catalogo/${slug}`;
}

export function productoUploadFolder(sku: string, nombre: string): string {
  const slug = slugify(`${sku}-${nombre}`) || "producto";
  return `productos/${slug}`;
}
