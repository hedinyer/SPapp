"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { deleteBike, saveBike } from "@/lib/actions/admin-actions";
import type { BikeRow } from "@/lib/pipeline/types";
import { formatCop } from "@/lib/utils/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  bikeUploadFolder,
  ImageFileField,
  uploadImageFile,
} from "@/components/ui/image-file-field";
import { STORAGE_BUCKETS } from "@/lib/supabase/storage-buckets";

export function CatalogoManager({ bikes }: { bikes: BikeRow[] }) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<BikeRow | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <>
      <div className="flex justify-end">
        <Button
          onClick={() => {
            setEditing(null);
            setOpen(true);
          }}
          className="bg-black text-white hover:bg-neutral-800"
        >
          <Plus className="mr-2 h-4 w-4" />
          Nueva moto
        </Button>
      </div>

      <div className="hidden overflow-x-auto rounded-lg border border-neutral-200 lg:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Modelo</TableHead>
              <TableHead>Color</TableHead>
              <TableHead>Stock</TableHead>
              <TableHead>Cuota inicial</TableHead>
              <TableHead>Cuota diaria</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="w-24" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {bikes.map((bike) => (
              <TableRow key={bike.id}>
                <TableCell className="font-medium">{bike.modelo}</TableCell>
                <TableCell>{bike.color}</TableCell>
                <TableCell>{bike.stock}</TableCell>
                <TableCell>{formatCop(bike.cuota_inicial)}</TableCell>
                <TableCell>{formatCop(bike.cuota_diaria)}</TableCell>
                <TableCell>
                  <Badge variant={bike.activo ? "outline" : "secondary"}>
                    {bike.activo ? "Activo" : "Inactivo"}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setEditing(bike);
                        setOpen(true);
                      }}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent className="bg-white">
                        <AlertDialogHeader>
                          <AlertDialogTitle>¿Eliminar moto?</AlertDialogTitle>
                          <AlertDialogDescription>
                            {bike.modelo} · {bike.color}
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() =>
                              startTransition(async () => {
                                try {
                                  await deleteBike(bike.id);
                                  toast.success("Moto eliminada.");
                                } catch (e) {
                                  toast.error(
                                    e instanceof Error
                                      ? e.message
                                      : "No se pudo eliminar.",
                                  );
                                }
                              })
                            }
                          >
                            Eliminar
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="space-y-3 lg:hidden">
        {bikes.map((bike) => (
          <div
            key={bike.id}
            className="rounded-lg border border-neutral-200 p-4 text-sm"
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-medium">{bike.modelo}</p>
                <p className="text-neutral-500">{bike.color}</p>
              </div>
              <Badge variant={bike.activo ? "outline" : "secondary"}>
                {bike.activo ? "Activo" : "Inactivo"}
              </Badge>
            </div>
            <dl className="mt-3 space-y-1.5">
              <div className="flex justify-between gap-2">
                <dt className="text-neutral-500">Stock</dt>
                <dd>{bike.stock}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-neutral-500">Cuota inicial</dt>
                <dd>{formatCop(bike.cuota_inicial)}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-neutral-500">Cuota diaria</dt>
                <dd>{formatCop(bike.cuota_diaria)}</dd>
              </div>
            </dl>
            <div className="mt-3 flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={() => {
                  setEditing(bike);
                  setOpen(true);
                }}
              >
                <Pencil className="mr-1 h-4 w-4" />
                Editar
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" size="sm" className="flex-1">
                    <Trash2 className="mr-1 h-4 w-4" />
                    Eliminar
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="bg-white">
                  <AlertDialogHeader>
                    <AlertDialogTitle>¿Eliminar moto?</AlertDialogTitle>
                    <AlertDialogDescription>
                      {bike.modelo} · {bike.color}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() =>
                        startTransition(async () => {
                          try {
                            await deleteBike(bike.id);
                            toast.success("Moto eliminada.");
                          } catch (e) {
                            toast.error(
                              e instanceof Error
                                ? e.message
                                : "No se pudo eliminar.",
                            );
                          }
                        })
                      }
                    >
                      Eliminar
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        ))}
      </div>

      <BikeDialog
        open={open}
        onOpenChange={setOpen}
        editing={editing}
        pending={pending}
        onSave={(form) =>
          startTransition(async () => {
            try {
              let imagenUrl = form.imagenUrl;

              if (form.imageFile) {
                imagenUrl = await uploadImageFile(
                  STORAGE_BUCKETS.bikeImages,
                  bikeUploadFolder(form.modelo, form.color),
                  form.imageFile,
                );
              }

              await saveBike({ ...form, imagenUrl });
              toast.success(editing ? "Moto actualizada." : "Moto creada.");
              setOpen(false);
            } catch (e) {
              toast.error(
                e instanceof Error ? e.message : "Error al guardar.",
              );
            }
          })
        }
      />
    </>
  );
}

function BikeDialog({
  open,
  onOpenChange,
  editing,
  pending,
  onSave,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editing: BikeRow | null;
  pending: boolean;
  onSave: (form: {
    id?: number;
    modelo: string;
    color: string;
    imagenUrl: string;
    imageFile: File | null;
    stock: number;
    cuotaInicial: number;
    cuotaDiaria: number;
    descripcion: string;
    activo: boolean;
  }) => void;
}) {
  const [modelo, setModelo] = useState("");
  const [color, setColor] = useState("");
  const [imagenUrl, setImagenUrl] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [stock, setStock] = useState("0");
  const [cuotaInicial, setCuotaInicial] = useState("0");
  const [cuotaDiaria, setCuotaDiaria] = useState("38000");
  const [descripcion, setDescripcion] = useState("");
  const [activo, setActivo] = useState(true);

  function loadEditing() {
    setModelo(editing?.modelo ?? "");
    setColor(editing?.color ?? "");
    setImagenUrl(editing?.imagen_url ?? "");
    setImageFile(null);
    setStock(String(editing?.stock ?? 0));
    setCuotaInicial(String(editing?.cuota_inicial ?? 0));
    setCuotaDiaria(String(editing?.cuota_diaria ?? 38000));
    setDescripcion(editing?.descripcion ?? "");
    setActivo(editing?.activo ?? true);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        onOpenChange(v);
        if (v) loadEditing();
      }}
    >
      <DialogContent className="max-h-[90vh] overflow-y-auto bg-white">
        <DialogHeader>
          <DialogTitle>{editing ? "Editar moto" : "Nueva moto"}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Modelo" value={modelo} onChange={setModelo} />
          <Field label="Color" value={color} onChange={setColor} />
          <Field
            label="Stock"
            value={stock}
            onChange={setStock}
            type="number"
          />
          <Field
            label="Cuota inicial"
            value={cuotaInicial}
            onChange={setCuotaInicial}
            type="number"
          />
          <Field
            label="Cuota diaria"
            value={cuotaDiaria}
            onChange={setCuotaDiaria}
            type="number"
          />
          <div className="sm:col-span-2">
            <ImageFileField
              label="Foto de la moto"
              existingUrl={imagenUrl}
              file={imageFile}
              onFileChange={setImageFile}
              disabled={pending}
              enableCamera
              fileInputId="catalogo-bike-file"
              cameraInputId="catalogo-bike-camera"
            />
          </div>
          <div className="sm:col-span-2">
            <Field
              label="Descripción"
              value={descripcion}
              onChange={setDescripcion}
            />
          </div>
          <div className="flex items-center gap-2 sm:col-span-2">
            <Switch checked={activo} onCheckedChange={setActivo} />
            <Label>Activo en catálogo</Label>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            className="bg-black text-white hover:bg-neutral-800"
            disabled={pending || !modelo.trim() || !color.trim()}
            onClick={() =>
              onSave({
                id: editing?.id,
                modelo,
                color,
                imagenUrl,
                imageFile,
                stock: Number(stock),
                cuotaInicial: Number(cuotaInicial),
                cuotaDiaria: Number(cuotaDiaria),
                descripcion,
                activo,
              })
            }
          >
            {pending ? "Guardando…" : "Guardar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="min-h-11 touch-manipulation text-base md:text-sm"
      />
    </div>
  );
}
