"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { MapPin, Upload } from "lucide-react";
import {
  completeVisitaVisitador,
  uploadVisitaPhoto,
  uploadVisitaVideo,
} from "@/lib/actions/visitador-actions";
import type {
  VisitaEvidenciaFoto,
  VisitaEvidenciaVideo,
  VisitaRow,
  VisitaUbicacionVerificada,
} from "@/lib/pipeline/types";
import { formatDate } from "@/lib/utils/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function VisitaEjecucionForm({ visita }: { visita: VisitaRow }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [fotos, setFotos] = useState<VisitaEvidenciaFoto[]>([]);
  const [videos, setVideos] = useState<VisitaEvidenciaVideo[]>([]);
  const [ubicacion, setUbicacion] = useState<VisitaUbicacionVerificada | null>(
    null,
  );
  const [notas, setNotas] = useState("");
  const [capturingLocation, setCapturingLocation] = useState(false);

  const canComplete =
    fotos.length >= 1 && videos.length >= 1 && ubicacion?.lat != null;

  async function handlePhotoUpload(file: File) {
    const fd = new FormData();
    fd.set("file", file);
    const foto = await uploadVisitaPhoto(visita.id, fd);
    setFotos((prev) => [...prev, foto]);
  }

  async function handleVideoUpload(file: File) {
    const fd = new FormData();
    fd.set("file", file);
    const video = await uploadVisitaVideo(visita.id, fd);
    setVideos((prev) => [...prev, video]);
  }

  function captureLocation() {
    if (!navigator.geolocation) {
      toast.error("Tu navegador no soporta geolocalización.");
      return;
    }

    setCapturingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUbicacion({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          captured_at: new Date().toISOString(),
        });
        setCapturingLocation(false);
        toast.success("Ubicación capturada.");
      },
      (err) => {
        setCapturingLocation(false);
        toast.error(err.message || "No se pudo obtener la ubicación.");
      },
      { enableHighAccuracy: true, timeout: 15000 },
    );
  }

  function handleComplete() {
    if (!ubicacion) return;

    startTransition(async () => {
      try {
        await completeVisitaVisitador({
          visitaId: visita.id,
          fotos,
          videos,
          ubicacion,
          notas,
        });
        toast.success("Visita completada.");
        router.push("/visitador/mis-visitas");
        router.refresh();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Error al completar.");
      }
    });
  }

  return (
    <div className="space-y-6">
      <Card className="border-neutral-200 shadow-none">
        <CardHeader>
          <CardTitle className="text-lg">{visita.cliente_nombre}</CardTitle>
          <p className="text-sm text-neutral-500">
            Programada: {formatDate(visita.fecha_programada)}
          </p>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>
            <span className="text-neutral-500">Celular: </span>
            {visita.cliente_celular ?? "—"}
          </p>
          <p>
            <span className="text-neutral-500">Dirección: </span>
            {[visita.direccion_visita, visita.barrio]
              .filter(Boolean)
              .join(", ") || "—"}
          </p>
        </CardContent>
      </Card>

      <Card className="border-neutral-200 shadow-none">
        <CardHeader>
          <CardTitle className="text-base">Fotos de evidencia</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            disabled={pending}
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              try {
                await handlePhotoUpload(file);
                toast.success("Foto subida.");
              } catch (err) {
                toast.error(
                  err instanceof Error ? err.message : "Error al subir foto.",
                );
              }
              e.target.value = "";
            }}
          />
          {fotos.length > 0 && (
            <p className="text-sm text-green-700">{fotos.length} foto(s) lista(s)</p>
          )}
        </CardContent>
      </Card>

      <Card className="border-neutral-200 shadow-none">
        <CardHeader>
          <CardTitle className="text-base">Video de evidencia</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input
            type="file"
            accept="video/mp4,video/webm,video/quicktime"
            disabled={pending}
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              try {
                await handleVideoUpload(file);
                toast.success("Video subido.");
              } catch (err) {
                toast.error(
                  err instanceof Error ? err.message : "Error al subir video.",
                );
              }
              e.target.value = "";
            }}
          />
          {videos.length > 0 && (
            <p className="text-sm text-green-700">
              {videos.length} video(s) listo(s)
            </p>
          )}
        </CardContent>
      </Card>

      <Card className="border-neutral-200 shadow-none">
        <CardHeader>
          <CardTitle className="text-base">Ubicación exacta</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button
            variant="outline"
            disabled={pending || capturingLocation}
            onClick={captureLocation}
          >
            <MapPin className="mr-2 h-4 w-4" />
            {capturingLocation ? "Obteniendo…" : "Obtener ubicación"}
          </Button>
          {ubicacion && (
            <p className="text-sm text-green-700">
              {ubicacion.lat.toFixed(6)}, {ubicacion.lng.toFixed(6)}
              {ubicacion.accuracy != null &&
                ` · ±${Math.round(ubicacion.accuracy)} m`}
            </p>
          )}
        </CardContent>
      </Card>

      <div className="space-y-2">
        <Label htmlFor="notas">Notas (opcional)</Label>
        <Textarea
          id="notas"
          value={notas}
          onChange={(e) => setNotas(e.target.value)}
          rows={3}
        />
      </div>

      <Button
        size="lg"
        className="w-full bg-black text-white hover:bg-neutral-800"
        disabled={pending || !canComplete}
        onClick={handleComplete}
      >
        <Upload className="mr-2 h-4 w-4" />
        {pending ? "Completando…" : "Completar visita"}
      </Button>
    </div>
  );
}
