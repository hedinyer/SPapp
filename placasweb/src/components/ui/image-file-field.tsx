"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, ImagePlus, X } from "lucide-react";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface ImageFileFieldProps {
  label?: string;
  existingUrl?: string | null;
  file: File | null;
  onFileChange: (file: File | null) => void;
  disabled?: boolean;
  enableCamera?: boolean;
  fileInputId?: string;
  cameraInputId?: string;
}

function validateImageFile(file: File): string | null {
  if (file.size === 0) return "La imagen está vacía.";
  if (file.size > 12 * 1024 * 1024) {
    return "La imagen no puede superar 12 MB.";
  }
  return null;
}

export function ImageFileField({
  label = "Foto",
  existingUrl,
  file,
  onFileChange,
  disabled,
  enableCamera = true,
  fileInputId = "image-file-picker",
  cameraInputId = "image-camera-picker",
}: ImageFileFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

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

  function selectFile(selected: File | null) {
    if (!selected) {
      onFileChange(null);
      return;
    }
    const validationError = validateImageFile(selected);
    if (validationError) {
      setError(validationError);
      return;
    }
    setError(null);
    onFileChange(selected);
  }

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex flex-col gap-3">
        <div className="relative h-40 w-full overflow-hidden rounded-lg border border-neutral-200 bg-neutral-50">
          {displayUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={displayUrl}
              alt="Vista previa"
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-neutral-400">
              <ImagePlus className="h-10 w-10" strokeWidth={1.5} />
            </div>
          )}
        </div>
        <input
          ref={inputRef}
          id={fileInputId}
          type="file"
          accept="image/*"
          className="hidden"
          disabled={disabled}
          onChange={(e) => {
            selectFile(e.target.files?.[0] ?? null);
            e.target.value = "";
          }}
        />
        {enableCamera && (
          <input
            ref={cameraInputRef}
            id={cameraInputId}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            disabled={disabled}
            onChange={(e) => {
              selectFile(e.target.files?.[0] ?? null);
              e.target.value = "";
            }}
          />
        )}
        <div className="grid grid-cols-2 gap-2">
          {enableCamera && (
            <label
              htmlFor={cameraInputId}
              className={cn(
                "inline-flex min-h-11 touch-manipulation cursor-pointer items-center justify-center gap-2 rounded-lg border border-border bg-background px-3 text-sm font-medium",
                disabled && "pointer-events-none opacity-50",
              )}
            >
              <Camera className="h-4 w-4" />
              Tomar foto
            </label>
          )}
          <label
            htmlFor={fileInputId}
            className={cn(
              "inline-flex min-h-11 touch-manipulation cursor-pointer items-center justify-center gap-2 rounded-lg border border-border bg-background px-3 text-sm font-medium",
              enableCamera ? "" : "col-span-2",
              disabled && "pointer-events-none opacity-50",
            )}
          >
            <ImagePlus className="h-4 w-4" />
            Galería
          </label>
        </div>
        {file && (
          <div className="flex items-center gap-2 text-sm text-neutral-600">
            <span className="truncate">{file.name}</span>
            <button
              type="button"
              className="text-neutral-400 hover:text-black"
              disabled={disabled}
              onClick={() => {
                onFileChange(null);
                setError(null);
                if (inputRef.current) inputRef.current.value = "";
                if (cameraInputRef.current) cameraInputRef.current.value = "";
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
        {error && <p className="text-xs text-red-600">{error}</p>}
      </div>
    </div>
  );
}
