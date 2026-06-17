"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Camera, Loader2, MapPin, Phone, Upload, Video } from "lucide-react";
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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function mapsUrl(direccion: string, barrio?: string | null) {
  const query = [direccion, barrio].filter(Boolean).join(", ");
  return `https://maps.apple.com/?q=${encodeURIComponent(query)}`;
}

export function VisitaEjecucionForm({ visita }: { visita: VisitaRow }) {
  const router = useRouter();
  const photoInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [fotos, setFotos] = useState<VisitaEvidenciaFoto[]>([]);
  const [videos, setVideos] = useState<VisitaEvidenciaVideo[]>([]);
  const [ubicacion, setUbicacion] = useState<VisitaUbicacionVerificada | null>(
    null,
  );
  const [notas, setNotas] = useState("");
  const [capturingLocation, setCapturingLocation] = useState(false);

  const direccionCompleta =
    [visita.direccion_visita, visita.barrio].filter(Boolean).join(", ") || null;

  const canComplete =
    fotos.length >= 1 && videos.length >= 1 && ubicacion?.lat != null;

  async function handlePhotoUpload(file: File) {
    setUploadingPhoto(true);
    try {
      const fd = new FormData();
      fd.set("file", file);
      const foto = await uploadVisitaPhoto(visita.id, fd);
      setFotos((prev) => [...prev, foto]);
      toast.success("Foto subida.");
    } finally {
      setUploadingPhoto(false);
    }
  }

  async function handleVideoUpload(file: File) {
    setUploadingVideo(true);
    try {
      const fd = new FormData();
      fd.set("file", file);
      const video = await uploadVisitaVideo(visita.id, fd);
      setVideos((prev) => [...prev, video]);
      toast.success("Video subido.");
    } finally {
      setUploadingVideo(false);
    }
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
    <>
      <div className="space-y-6 pb-28">
        <Card className="border-neutral-200 shadow-none">
          <CardHeader>
            <CardTitle className="text-lg">{visita.cliente_nombre}</CardTitle>
            <p className="text-sm text-neutral-500">
              Programada: {formatDate(visita.fecha_programada)}
            </p>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div>
              <span className="text-neutral-500">Celular: </span>
              {visita.cliente_celular ? (
                <a
                  href={`tel:${visita.cliente_celular.replace(/\s/g, "")}`}
                  className="inline-flex min-h-11 items-center gap-1 font-medium text-black underline-offset-2 hover:underline"
                >
                  <Phone className="h-4 w-4" />
                  {visita.cliente_celular}
                </a>
              ) : (
                "—"
              )}
            </div>
            <div>
              <span className="text-neutral-500">Dirección: </span>
              {direccionCompleta ? (
                <a
                  href={mapsUrl(
                    visita.direccion_visita ?? "",
                    visita.barrio,
                  )}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-11 items-center gap-1 font-medium text-black underline-offset-2 hover:underline"
                >
                  <MapPin className="h-4 w-4 shrink-0" />
                  {direccionCompleta}
                </a>
              ) : (
                "—"
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="border-neutral-200 shadow-none">
          <CardHeader>
            <CardTitle className="text-base">Fotos de evidencia</CardTitle>
            <p className="text-sm text-neutral-500">
              Mínimo 1 foto del domicilio o moto.
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            <input
              ref={photoInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              capture="environment"
              className="hidden"
              disabled={pending || uploadingPhoto}
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                try {
                  await handlePhotoUpload(file);
                } catch (err) {
                  toast.error(
                    err instanceof Error ? err.message : "Error al subir foto.",
                  );
                }
                e.target.value = "";
              }}
            />
            <Button
              type="button"
              variant="outline"
              className="min-h-11 w-full"
              disabled={pending || uploadingPhoto}
              onClick={() => photoInputRef.current?.click()}
            >
              {uploadingPhoto ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Camera className="mr-2 h-4 w-4" />
              )}
              {uploadingPhoto ? "Subiendo foto…" : "Tomar o elegir foto"}
            </Button>
            {fotos.length > 0 && (
              <div className="grid grid-cols-2 gap-2">
                {fotos.map((foto, i) => (
                  <a
                    key={`${foto.url}-${i}`}
                    href={foto.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block overflow-hidden rounded-lg border border-neutral-200"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={foto.url}
                      alt={`Evidencia ${i + 1}`}
                      className="aspect-square w-full object-cover"
                    />
                  </a>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-neutral-200 shadow-none">
          <CardHeader>
            <CardTitle className="text-base">Video de evidencia</CardTitle>
            <p className="text-sm text-neutral-500">Mínimo 1 video corto.</p>
          </CardHeader>
          <CardContent className="space-y-3">
            <input
              ref={videoInputRef}
              type="file"
              accept="video/mp4,video/webm,video/quicktime"
              capture="environment"
              className="hidden"
              disabled={pending || uploadingVideo}
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                try {
                  await handleVideoUpload(file);
                } catch (err) {
                  toast.error(
                    err instanceof Error ? err.message : "Error al subir video.",
                  );
                }
                e.target.value = "";
              }}
            />
            <Button
              type="button"
              variant="outline"
              className="min-h-11 w-full"
              disabled={pending || uploadingVideo}
              onClick={() => videoInputRef.current?.click()}
            >
              {uploadingVideo ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Video className="mr-2 h-4 w-4" />
              )}
              {uploadingVideo ? "Subiendo video…" : "Grabar o elegir video"}
            </Button>
            {videos.length > 0 && (
              <div className="space-y-3">
                {videos.map((video, i) => (
                  <video
                    key={`${video.url}-${i}`}
                    src={video.url}
                    controls
                    className="w-full rounded-lg border border-neutral-200"
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-neutral-200 shadow-none">
          <CardHeader>
            <CardTitle className="text-base">Ubicación exacta</CardTitle>
            <p className="text-sm text-neutral-500">
              Necesitamos confirmar que estás en el domicilio del cliente.
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button
              variant="outline"
              className="min-h-11 w-full"
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
      </div>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-neutral-200 bg-white p-4 safe-area-bottom">
        <Button
          size="lg"
          className="min-h-11 w-full bg-black text-white hover:bg-neutral-800"
          disabled={pending || !canComplete || uploadingPhoto || uploadingVideo}
          onClick={handleComplete}
        >
          {pending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Upload className="mr-2 h-4 w-4" />
          )}
          {pending ? "Completando…" : "Completar visita"}
        </Button>
        {!canComplete && (
          <p className="mt-2 text-center text-xs text-neutral-500">
            Sube al menos 1 foto, 1 video y captura la ubicación.
          </p>
        )}
      </div>
    </>
  );
}
