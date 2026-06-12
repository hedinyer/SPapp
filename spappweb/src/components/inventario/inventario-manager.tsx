"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { usePollingRefresh } from "@/hooks/use-polling-refresh";
import { Pencil, Plus, Trash2 } from "lucide-react";
import {
  deleteCategoria,
  deleteProducto,
  saveCategoria,
  saveProducto,
} from "@/lib/actions/admin-actions";
import type {
  InventarioCategoriaRow,
  InventarioProductoRow,
} from "@/lib/pipeline/types";
import { formatCop } from "@/lib/utils/format";
import { getStoragePublicUrl } from "@/lib/utils/storage-urls";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  productoUploadFolder,
  uploadImageFile,
} from "@/components/ui/image-file-field";
import { STORAGE_BUCKETS } from "@/lib/supabase/storage-buckets";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

export function InventarioManager({
  categorias,
  productos,
}: {
  categorias: InventarioCategoriaRow[];
  productos: InventarioProductoRow[];
}) {
  const [catOpen, setCatOpen] = useState(false);
  const [prodOpen, setProdOpen] = useState(false);
  const [editingCat, setEditingCat] = useState<InventarioCategoriaRow | null>(
    null,
  );
  const [editingProd, setEditingProd] = useState<InventarioProductoRow | null>(
    null,
  );
  const [pending, startTransition] = useTransition();

  const { secondsAgo } = usePollingRefresh({
    intervalMs: 30_000,
    enabled: !catOpen && !prodOpen && !pending,
  });

  return (
    <div className="space-y-2">
      <p className="text-xs text-neutral-500">
        Stock actualizado hace {secondsAgo}s
      </p>
      <Tabs defaultValue="productos">
      <TabsList>
        <TabsTrigger value="productos">Productos</TabsTrigger>
        <TabsTrigger value="categorias">Categorías</TabsTrigger>
      </TabsList>

      <TabsContent value="productos" className="space-y-4">
        <div className="flex justify-end">
          <Button
            className="bg-black text-white hover:bg-neutral-800"
            onClick={() => {
              setEditingProd(null);
              setProdOpen(true);
            }}
          >
            <Plus className="mr-2 h-4 w-4" />
            Nuevo producto
          </Button>
        </div>
        <div className="overflow-x-auto rounded-lg border border-neutral-200">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Producto</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead>Categoría</TableHead>
                <TableHead>Precio</TableHead>
                <TableHead>Stock</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="w-24" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {productos.map((p) => {
                const img = getStoragePublicUrl(
                  STORAGE_BUCKETS.inventarioImagenes,
                  p.imagen_url,
                );
                const lowStock = p.stock <= p.stock_minimo;
                return (
                  <TableRow key={p.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        {img ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={img}
                            alt=""
                            className="h-10 w-10 rounded object-cover"
                          />
                        ) : (
                          <div className="h-10 w-10 rounded bg-neutral-100" />
                        )}
                        <span className="font-medium">{p.nombre}</span>
                      </div>
                    </TableCell>
                    <TableCell>{p.sku}</TableCell>
                    <TableCell>
                      {p.inventario_categorias?.nombre ?? "—"}
                    </TableCell>
                    <TableCell>{formatCop(p.precio)}</TableCell>
                    <TableCell>
                      <span className={lowStock ? "font-medium text-red-700" : ""}>
                        {p.stock}
                      </span>
                      {lowStock && (
                        <Badge variant="destructive" className="ml-2">
                          Bajo
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={p.activo ? "outline" : "secondary"}>
                        {p.activo ? "Activo" : "Inactivo"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setEditingProd(p);
                            setProdOpen(true);
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
                              <AlertDialogTitle>¿Eliminar producto?</AlertDialogTitle>
                              <AlertDialogDescription>{p.nombre}</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() =>
                                  startTransition(async () => {
                                    try {
                                      await deleteProducto(p.id);
                                      toast.success("Producto eliminado.");
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
                );
              })}
            </TableBody>
          </Table>
        </div>
      </TabsContent>

      <TabsContent value="categorias" className="space-y-4">
        <div className="flex justify-end">
          <Button
            className="bg-black text-white hover:bg-neutral-800"
            onClick={() => {
              setEditingCat(null);
              setCatOpen(true);
            }}
          >
            <Plus className="mr-2 h-4 w-4" />
            Nueva categoría
          </Button>
        </div>
        <div className="overflow-x-auto rounded-lg border border-neutral-200">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Slug</TableHead>
                <TableHead>Orden</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="w-24" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {categorias.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.nombre}</TableCell>
                  <TableCell>{c.slug}</TableCell>
                  <TableCell>{c.orden}</TableCell>
                  <TableCell>
                    <Badge variant={c.activo ? "outline" : "secondary"}>
                      {c.activo ? "Activa" : "Inactiva"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setEditingCat(c);
                          setCatOpen(true);
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
                            <AlertDialogTitle>¿Eliminar categoría?</AlertDialogTitle>
                            <AlertDialogDescription>{c.nombre}</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() =>
                                startTransition(async () => {
                                  try {
                                    await deleteCategoria(c.id);
                                    toast.success("Categoría eliminada.");
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
      </TabsContent>

      <CategoriaDialog
        open={catOpen}
        onOpenChange={setCatOpen}
        editing={editingCat}
        pending={pending}
        onSave={(form) =>
          startTransition(async () => {
            try {
              await saveCategoria(form);
              toast.success(editingCat ? "Categoría actualizada." : "Categoría creada.");
              setCatOpen(false);
            } catch (e) {
              toast.error(e instanceof Error ? e.message : "Error al guardar.");
            }
          })
        }
      />

      <ProductoDialog
        open={prodOpen}
        onOpenChange={setProdOpen}
        editing={editingProd}
        categorias={categorias}
        pending={pending}
        onSave={(form) =>
          startTransition(async () => {
            try {
              let imagenUrl = form.imagenUrl;
              if (form.imageFile) {
                imagenUrl = await uploadImageFile(
                  STORAGE_BUCKETS.inventarioImagenes,
                  productoUploadFolder(form.sku, form.nombre),
                  form.imageFile,
                );
              }
              await saveProducto({ ...form, imagenUrl });
              toast.success(editingProd ? "Producto actualizado." : "Producto creado.");
              setProdOpen(false);
            } catch (e) {
              toast.error(e instanceof Error ? e.message : "Error al guardar.");
            }
          })
        }
      />
    </Tabs>
    </div>
  );
}

function CategoriaDialog({
  open,
  onOpenChange,
  editing,
  pending,
  onSave,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editing: InventarioCategoriaRow | null;
  pending: boolean;
  onSave: (form: {
    id?: number;
    nombre: string;
    slug: string;
    descripcion: string;
    activo: boolean;
    orden: number;
  }) => void;
}) {
  const [nombre, setNombre] = useState("");
  const [slug, setSlug] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [orden, setOrden] = useState("0");
  const [activo, setActivo] = useState(true);

  function load() {
    setNombre(editing?.nombre ?? "");
    setSlug(editing?.slug ?? "");
    setDescripcion(editing?.descripcion ?? "");
    setOrden(String(editing?.orden ?? 0));
    setActivo(editing?.activo ?? true);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        onOpenChange(v);
        if (v) load();
      }}
    >
      <DialogContent className="bg-white">
        <DialogHeader>
          <DialogTitle>
            {editing ? "Editar categoría" : "Nueva categoría"}
          </DialogTitle>
        </DialogHeader>
        <div className="grid gap-4">
          <Field label="Nombre" value={nombre} onChange={setNombre} />
          <Field label="Slug" value={slug} onChange={setSlug} />
          <Field label="Orden" value={orden} onChange={setOrden} type="number" />
          <div className="space-y-2">
            <Label>Descripción</Label>
            <Textarea value={descripcion} onChange={(e) => setDescripcion(e.target.value)} />
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={activo} onCheckedChange={setActivo} />
            <Label>Activa</Label>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            className="bg-black text-white hover:bg-neutral-800"
            disabled={pending || !nombre.trim() || !slug.trim()}
            onClick={() =>
              onSave({
                id: editing?.id,
                nombre,
                slug,
                descripcion,
                activo,
                orden: Number(orden),
              })
            }
          >
            Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ProductoDialog({
  open,
  onOpenChange,
  editing,
  categorias,
  pending,
  onSave,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editing: InventarioProductoRow | null;
  categorias: InventarioCategoriaRow[];
  pending: boolean;
  onSave: (form: {
    id?: number;
    categoriaId: number;
    sku: string;
    nombre: string;
    descripcion: string;
    precio: number;
    stock: number;
    stockMinimo: number;
    imagenUrl: string;
    imageFile: File | null;
    compatibleModelos: string[];
    activo: boolean;
  }) => void;
}) {
  const [categoriaId, setCategoriaId] = useState("");
  const [sku, setSku] = useState("");
  const [nombre, setNombre] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [precio, setPrecio] = useState("0");
  const [stock, setStock] = useState("0");
  const [stockMinimo, setStockMinimo] = useState("0");
  const [imagenUrl, setImagenUrl] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [modelos, setModelos] = useState("");
  const [activo, setActivo] = useState(true);

  function load() {
    setCategoriaId(String(editing?.categoria_id ?? categorias[0]?.id ?? ""));
    setSku(editing?.sku ?? "");
    setNombre(editing?.nombre ?? "");
    setDescripcion(editing?.descripcion ?? "");
    setPrecio(String(editing?.precio ?? 0));
    setStock(String(editing?.stock ?? 0));
    setStockMinimo(String(editing?.stock_minimo ?? 0));
    setImagenUrl(editing?.imagen_url ?? "");
    setImageFile(null);
    setModelos((editing?.compatible_modelos ?? []).join(", "));
    setActivo(editing?.activo ?? true);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        onOpenChange(v);
        if (v) load();
      }}
    >
      <DialogContent className="max-h-[90vh] overflow-y-auto bg-white">
        <DialogHeader>
          <DialogTitle>{editing ? "Editar producto" : "Nuevo producto"}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label>Categoría</Label>
            <Select value={categoriaId} onValueChange={setCategoriaId}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar" />
              </SelectTrigger>
              <SelectContent>
                {categorias.map((c) => (
                  <SelectItem key={c.id} value={String(c.id)}>
                    {c.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Field label="SKU" value={sku} onChange={setSku} />
          <Field label="Nombre" value={nombre} onChange={setNombre} />
          <Field label="Precio" value={precio} onChange={setPrecio} type="number" />
          <Field label="Stock" value={stock} onChange={setStock} type="number" />
          <Field
            label="Stock mínimo"
            value={stockMinimo}
            onChange={setStockMinimo}
            type="number"
          />
          <div className="sm:col-span-2">
            <ImageFileField
              label="Foto del producto"
              existingUrl={imagenUrl}
              file={imageFile}
              onFileChange={setImageFile}
              disabled={pending}
            />
          </div>
          <div className="sm:col-span-2">
            <Field
              label="Modelos compatibles (separados por coma)"
              value={modelos}
              onChange={setModelos}
            />
          </div>
          <div className="sm:col-span-2">
            <Label>Descripción</Label>
            <Textarea value={descripcion} onChange={(e) => setDescripcion(e.target.value)} />
          </div>
          <div className="flex items-center gap-2 sm:col-span-2">
            <Switch checked={activo} onCheckedChange={setActivo} />
            <Label>Activo en tienda</Label>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            className="bg-black text-white hover:bg-neutral-800"
            disabled={pending || !sku.trim() || !nombre.trim() || !categoriaId}
            onClick={() =>
              onSave({
                id: editing?.id,
                categoriaId: Number(categoriaId),
                sku,
                nombre,
                descripcion,
                precio: Number(precio),
                stock: Number(stock),
                stockMinimo: Number(stockMinimo),
                imagenUrl,
                imageFile,
                compatibleModelos: modelos
                  .split(",")
                  .map((m) => m.trim())
                  .filter(Boolean),
                activo,
              })
            }
          >
            Guardar
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
      <Input type={type} value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}
