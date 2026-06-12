"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { deleteVisitador, saveVisitador } from "@/lib/actions/admin-actions";
import type { VisitadorRow } from "@/lib/pipeline/types";
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
  ImageFileField,
  uploadImageFile,
  visitadorUploadFolder,
} from "@/components/ui/image-file-field";
import { STORAGE_BUCKETS } from "@/lib/supabase/storage-buckets";

export function VisitadoresManager({
  visitadores,
}: {
  visitadores: VisitadorRow[];
}) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<VisitadorRow | null>(null);
  const [pending, startTransition] = useTransition();

  function openCreate() {
    setEditing(null);
    setOpen(true);
  }

  function openEdit(v: VisitadorRow) {
    setEditing(v);
    setOpen(true);
  }

  function onSave(form: {
    nombre: string;
    telefono: string;
    fotoUrl: string;
    activo: boolean;
    photoFile: File | null;
  }) {
    startTransition(async () => {
      try {
        let fotoUrl = form.fotoUrl;

        if (form.photoFile) {
          fotoUrl = await uploadImageFile(
            STORAGE_BUCKETS.visitadorFotos,
            visitadorUploadFolder(editing?.id, form.nombre),
            form.photoFile,
          );
        }

        await saveVisitador({
          id: editing?.id,
          nombre: form.nombre,
          telefono: form.telefono,
          fotoUrl,
          activo: form.activo,
        });
        toast.success(editing ? "Visitador actualizado." : "Visitador creado.");
        setOpen(false);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Error al guardar.");
      }
    });
  }

  return (
    <>
      <div className="flex justify-end">
        <Button
          onClick={openCreate}
          className="bg-black text-white hover:bg-neutral-800"
        >
          <Plus className="mr-2 h-4 w-4" />
          Nuevo visitador
        </Button>
      </div>

      <div className="rounded-lg border border-neutral-200">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Teléfono</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="w-24" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {visitadores.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-neutral-500">
                  No hay visitadores. Crea uno para asignar visitas.
                </TableCell>
              </TableRow>
            ) : (
              visitadores.map((v) => (
                <TableRow key={v.id}>
                  <TableCell className="font-medium">{v.nombre}</TableCell>
                  <TableCell>{v.telefono ?? "—"}</TableCell>
                  <TableCell>
                    <Badge variant={v.activo ? "outline" : "secondary"}>
                      {v.activo ? "Activo" : "Inactivo"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEdit(v)}
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
                            <AlertDialogTitle>
                              ¿Eliminar visitador?
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                              {v.nombre}
                              {v.telefono ? ` · ${v.telefono}` : ""}. Las visitas
                              asignadas quedarán sin visitador.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() =>
                                startTransition(async () => {
                                  try {
                                    await deleteVisitador(v.id);
                                    toast.success("Visitador eliminado.");
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
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <VisitadorDialog
        open={open}
        onOpenChange={setOpen}
        editing={editing}
        pending={pending}
        onSave={onSave}
      />
    </>
  );
}

function VisitadorDialog({
  open,
  onOpenChange,
  editing,
  pending,
  onSave,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editing: VisitadorRow | null;
  pending: boolean;
  onSave: (form: {
    nombre: string;
    telefono: string;
    fotoUrl: string;
    activo: boolean;
    photoFile: File | null;
  }) => void;
}) {
  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");
  const [fotoUrl, setFotoUrl] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [activo, setActivo] = useState(true);

  function resetFromEditing() {
    setNombre(editing?.nombre ?? "");
    setTelefono(editing?.telefono ?? "");
    setFotoUrl(editing?.foto_url ?? "");
    setPhotoFile(null);
    setActivo(editing?.activo ?? true);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        onOpenChange(v);
        if (v) resetFromEditing();
      }}
    >
      <DialogContent className="bg-white">
        <DialogHeader>
          <DialogTitle>
            {editing ? "Editar visitador" : "Nuevo visitador"}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="nombre">Nombre</Label>
            <Input
              id="nombre"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="telefono">Teléfono</Label>
            <Input
              id="telefono"
              value={telefono}
              onChange={(e) => setTelefono(e.target.value)}
            />
          </div>
          <ImageFileField
            label="Foto del visitador"
            existingUrl={fotoUrl}
            file={photoFile}
            onFileChange={setPhotoFile}
            disabled={pending}
          />
          <div className="flex items-center gap-2">
            <Switch checked={activo} onCheckedChange={setActivo} />
            <Label>Activo</Label>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            className="bg-black text-white hover:bg-neutral-800"
            disabled={pending || nombre.trim().length < 2}
            onClick={() =>
              onSave({ nombre, telefono, fotoUrl, activo, photoFile })
            }
          >
            {pending ? "Guardando…" : "Guardar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
