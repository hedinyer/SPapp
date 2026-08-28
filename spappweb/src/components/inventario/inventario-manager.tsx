"use client";

import { useState, useTransition, useMemo } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { usePollingRefresh } from "@/hooks/use-polling-refresh";
import { ListFilter, Pencil, Plus, Search, Trash2, X } from "lucide-react";
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
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
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
import { Textarea } from "@/components/ui/textarea";
import { TouchSelect } from "@/components/ui/touch-select";
import { PrintPriceLabelButton } from "@/components/inventario/print-price-label-button";

function normalizeSearch(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

type StockPreset = "all" | "bajo" | "sin" | "con";

const STOCK_PRESETS: { value: StockPreset; label: string }[] = [
  { value: "all", label: "Todos" },
  { value: "bajo", label: "Casi no hay" },
  { value: "sin", label: "No hay" },
  { value: "con", label: "Sí hay" },
];

function parseOptionalMiles(raw: string): number | null {
  const digits = raw.replace(/\D/g, "");
  if (!digits) return null;
  const n = Number(digits);
  return Number.isFinite(n) ? n : null;
}

function inInclusiveRange(
  value: number,
  min: number | null,
  max: number | null,
): boolean {
  if (min != null && value < min) return false;
  if (max != null && value > max) return false;
  return true;
}

export function InventarioManager({
  categorias,
  productos,
}: {
  categorias: InventarioCategoriaRow[];
  productos: InventarioProductoRow[];
}) {
  const router = useRouter();
  const [catOpen, setCatOpen] = useState(false);
  const [prodOpen, setProdOpen] = useState(false);
  const [editingCat, setEditingCat] = useState<InventarioCategoriaRow | null>(
    null,
  );
  const [editingProd, setEditingProd] = useState<InventarioProductoRow | null>(
    null,
  );
  const [pending, startTransition] = useTransition();
  const [nombreQuery, setNombreQuery] = useState("");
  const [filtrosOpen, setFiltrosOpen] = useState(false);
  const [categoriaFiltro, setCategoriaFiltro] = useState("all");
  const [stockPreset, setStockPreset] = useState<StockPreset>("all");
  const [stockMin, setStockMin] = useState("");
  const [stockMax, setStockMax] = useState("");
  const [costoMin, setCostoMin] = useState("");
  const [costoMax, setCostoMax] = useState("");
  const [precioMin, setPrecioMin] = useState("");
  const [precioMax, setPrecioMax] = useState("");
  const [numerosOpen, setNumerosOpen] = useState(false);

  const categoriasActivas = useMemo(
    () =>
      [...categorias]
        .filter((c) => c.activo)
        .sort((a, b) =>
          a.nombre.localeCompare(b.nombre, "es", { sensitivity: "base" }),
        ),
    [categorias],
  );

  const filtrosAvanzadosActivos = useMemo(() => {
    let n = 0;
    if (categoriaFiltro !== "all") n += 1;
    if (stockPreset !== "all") n += 1;
    if (stockMin.trim() || stockMax.trim()) n += 1;
    if (costoMin.trim() || costoMax.trim()) n += 1;
    if (precioMin.trim() || precioMax.trim()) n += 1;
    return n;
  }, [
    categoriaFiltro,
    stockPreset,
    stockMin,
    stockMax,
    costoMin,
    costoMax,
    precioMin,
    precioMax,
  ]);

  const hayFiltros =
    Boolean(nombreQuery.trim()) || filtrosAvanzadosActivos > 0;

  const productosFiltrados = useMemo(() => {
    const q = normalizeSearch(nombreQuery.trim());
    const terms = q ? q.split(/\s+/).filter(Boolean) : [];
    const sMin = parseOptionalMiles(stockMin);
    const sMax = parseOptionalMiles(stockMax);
    const cMin = parseOptionalMiles(costoMin);
    const cMax = parseOptionalMiles(costoMax);
    const pMin = parseOptionalMiles(precioMin);
    const pMax = parseOptionalMiles(precioMax);
    const categoriaId =
      categoriaFiltro === "all" ? null : Number(categoriaFiltro);

    return productos
      .filter((producto) => {
        const haystack = normalizeSearch(producto.nombre);
        if (
          terms.length > 0 &&
          !terms.every((term) => haystack.includes(term))
        ) {
          return false;
        }
        if (categoriaId != null && producto.categoria_id !== categoriaId) {
          return false;
        }
        if (stockPreset === "sin" && producto.stock !== 0) return false;
        if (stockPreset === "con" && producto.stock <= 0) return false;
        if (
          stockPreset === "bajo" &&
          producto.stock > producto.stock_minimo
        ) {
          return false;
        }
        if (!inInclusiveRange(producto.stock, sMin, sMax)) return false;
        if (!inInclusiveRange(producto.costo ?? 0, cMin, cMax)) return false;
        if (!inInclusiveRange(producto.precio, pMin, pMax)) return false;
        return true;
      })
      .sort((a, b) =>
        a.nombre.localeCompare(b.nombre, "es", { sensitivity: "base" }),
      );
  }, [
    productos,
    nombreQuery,
    categoriaFiltro,
    stockPreset,
    stockMin,
    stockMax,
    costoMin,
    costoMax,
    precioMin,
    precioMax,
  ]);

  function clearFiltrosAvanzados() {
    setCategoriaFiltro("all");
    setStockPreset("all");
    setStockMin("");
    setStockMax("");
    setCostoMin("");
    setCostoMax("");
    setPrecioMin("");
    setPrecioMax("");
  }

  function clearTodosLosFiltros() {
    setNombreQuery("");
    clearFiltrosAvanzados();
  }

  const { secondsAgo } = usePollingRefresh({
    intervalMs: 30_000,
    enabled: !catOpen && !prodOpen && !pending,
  });

  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs text-muted-foreground">
        Stock actualizado hace {secondsAgo}s
      </p>
      <Tabs defaultValue="productos">
      <TabsList className="w-full max-w-full overflow-x-auto">
        <TabsTrigger value="productos">Productos</TabsTrigger>
        <TabsTrigger value="categorias">Categorías</TabsTrigger>
      </TabsList>

      <TabsContent value="productos" className="flex flex-col gap-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative min-w-0 flex-1" role="search">
            <label htmlFor="inventario-buscar-nombre" className="sr-only">
              Buscar producto por nombre
            </label>
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              id="inventario-buscar-nombre"
              value={nombreQuery}
              onChange={(e) => setNombreQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Escape" && nombreQuery) {
                  e.preventDefault();
                  setNombreQuery("");
                }
              }}
              placeholder="Buscar por nombre…"
              className="min-h-11 pl-9 pr-9"
              inputMode="search"
              autoComplete="off"
              spellCheck={false}
            />
            {nombreQuery ? (
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="absolute right-1.5 top-1/2 -translate-y-1/2"
                aria-label="Borrar búsqueda"
                onClick={() => setNombreQuery("")}
              >
                <X aria-hidden="true" />
              </Button>
            ) : null}
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            <Button
              type="button"
              variant={
                filtrosOpen || filtrosAvanzadosActivos > 0
                  ? "default"
                  : "outline"
              }
              className="min-h-11"
              aria-expanded={filtrosOpen}
              aria-controls="inventario-filtros-avanzados"
              onClick={() => setFiltrosOpen((open) => !open)}
            >
              <ListFilter data-icon="inline-start" aria-hidden="true" />
              {filtrosOpen ? "Ocultar filtros" : "Filtrar"}
              {filtrosAvanzadosActivos > 0 ? (
                <Badge variant="secondary" className="ml-1 tabular-nums">
                  {filtrosAvanzadosActivos}
                  <span className="sr-only"> activos</span>
                </Badge>
              ) : null}
            </Button>
            <Button
              className="min-h-11"
              onClick={() => {
                setEditingProd(null);
                setProdOpen(true);
              }}
            >
              <Plus data-icon="inline-start" aria-hidden="true" />
              Nuevo producto
            </Button>
          </div>
        </div>

        <div
          id="inventario-filtros-avanzados"
          hidden={!filtrosOpen}
          className="flex flex-col gap-5 rounded-xl border border-border bg-background p-4"
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="text-base font-semibold text-foreground">
                Mostrar solo…
              </h2>
              <p className="text-sm text-muted-foreground">
                Elige una opción. Si no sabes, deja “Todos”.
              </p>
            </div>
            {filtrosAvanzadosActivos > 0 ? (
              <Button
                type="button"
                variant="outline"
                className="min-h-11"
                onClick={clearFiltrosAvanzados}
              >
                Quitar filtros
              </Button>
            ) : null}
          </div>

          <div className="flex flex-col gap-2">
            <p
              id="inventario-filtro-stock-label"
              className="text-sm font-medium text-foreground"
            >
              1. ¿Cuántos quedan?
            </p>
            <div
              role="group"
              aria-labelledby="inventario-filtro-stock-label"
              className="grid grid-cols-2 gap-2 sm:grid-cols-4"
            >
              {STOCK_PRESETS.map((preset) => {
                const pressed = stockPreset === preset.value;
                return (
                  <Button
                    key={preset.value}
                    type="button"
                    variant={pressed ? "default" : "outline"}
                    className="min-h-12 text-sm"
                    aria-pressed={pressed}
                    onClick={() => setStockPreset(preset.value)}
                  >
                    {preset.label}
                  </Button>
                );
              })}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label
              htmlFor="inventario-filtro-categoria"
              className="text-sm font-medium text-foreground"
            >
              2. ¿Qué tipo de producto?
            </Label>
            <TouchSelect
              id="inventario-filtro-categoria"
              aria-label="Qué tipo de producto"
              value={categoriaFiltro}
              onChange={setCategoriaFiltro}
              options={[
                { value: "all", label: "Todos los tipos" },
                ...categoriasActivas.map((c) => ({
                  value: String(c.id),
                  label: c.nombre,
                })),
              ]}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Button
              type="button"
              variant="ghost"
              className="min-h-11 w-fit justify-start px-0"
              aria-expanded={numerosOpen}
              aria-controls="inventario-filtros-numeros"
              onClick={() => setNumerosOpen((open) => !open)}
            >
              {numerosOpen
                ? "Ocultar cantidad y precios"
                : "También filtrar por cantidad o precios"}
            </Button>
            <div
              id="inventario-filtros-numeros"
              hidden={!numerosOpen}
              className="grid gap-4 sm:grid-cols-3"
            >
              <fieldset className="rounded-lg border border-border p-3">
                <legend className="px-1 text-sm font-medium">Cantidad</legend>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <Input
                    className="min-h-11"
                    inputMode="numeric"
                    placeholder="Desde"
                    value={stockMin}
                    onChange={(e) => setStockMin(e.target.value)}
                  />
                  <Input
                    className="min-h-11"
                    inputMode="numeric"
                    placeholder="Hasta"
                    value={stockMax}
                    onChange={(e) => setStockMax(e.target.value)}
                  />
                </div>
              </fieldset>
              <fieldset className="rounded-lg border border-border p-3">
                <legend className="px-1 text-sm font-medium">Costo</legend>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <Input
                    className="min-h-11"
                    inputMode="numeric"
                    placeholder="Desde"
                    value={costoMin}
                    onChange={(e) => setCostoMin(e.target.value)}
                  />
                  <Input
                    className="min-h-11"
                    inputMode="numeric"
                    placeholder="Hasta"
                    value={costoMax}
                    onChange={(e) => setCostoMax(e.target.value)}
                  />
                </div>
              </fieldset>
              <fieldset className="rounded-lg border border-border p-3">
                <legend className="px-1 text-sm font-medium">Venta</legend>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <Input
                    className="min-h-11"
                    inputMode="numeric"
                    placeholder="Desde"
                    value={precioMin}
                    onChange={(e) => setPrecioMin(e.target.value)}
                  />
                  <Input
                    className="min-h-11"
                    inputMode="numeric"
                    placeholder="Hasta"
                    value={precioMax}
                    onChange={(e) => setPrecioMax(e.target.value)}
                  />
                </div>
              </fieldset>
            </div>
          </div>
        </div>

        {productos.length === 0 ? (
          <Empty className="border border-dashed border-border">
            <EmptyHeader>
              <EmptyTitle>Stock vacío</EmptyTitle>
              <EmptyDescription>
                Aún no hay productos. Crea el primero con Nuevo producto.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : productosFiltrados.length === 0 ? (
          <Empty className="border border-dashed border-border">
            <EmptyHeader>
              <EmptyTitle>Ningún producto coincide</EmptyTitle>
              <EmptyDescription>
                Prueba otra búsqueda o quita filtros.
              </EmptyDescription>
            </EmptyHeader>
            {hayFiltros ? (
              <Button
                type="button"
                variant="outline"
                className="min-h-11"
                onClick={clearTodosLosFiltros}
              >
                Quitar todos los filtros
              </Button>
            ) : null}
          </Empty>
        ) : (
          <>
        {hayFiltros ? (
          <p className="text-sm text-muted-foreground" role="status">
            Quedan {productosFiltrados.length} de {productos.length} productos
          </p>
        ) : null}
        <div className="hidden overflow-x-auto rounded-lg border border-border lg:block">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Producto</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead>Categoría</TableHead>
                <TableHead>costo</TableHead>
                <TableHead>venta</TableHead>
                <TableHead>Stock</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="w-32" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {productosFiltrados.map((p) => {
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
                          <div className="h-10 w-10 rounded bg-muted" />
                        )}
                        <span className="font-medium">{p.nombre}</span>
                      </div>
                    </TableCell>
                    <TableCell>{p.sku}</TableCell>
                    <TableCell>
                      {p.inventario_categorias?.nombre ?? "—"}
                    </TableCell>
                    <TableCell>{formatCop(p.precio)}</TableCell>
                    <TableCell>{formatCop(p.costo ?? 0)}</TableCell>
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
                        <PrintPriceLabelButton product={p} />
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
                          <AlertDialogContent className="bg-background">
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
                                      router.refresh();
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

        <div className="flex flex-col gap-3 lg:hidden">
          {productosFiltrados.map((p) => {
            const img = getStoragePublicUrl(
              STORAGE_BUCKETS.inventarioImagenes,
              p.imagen_url,
            );
            const lowStock = p.stock <= p.stock_minimo;
            return (
              <div
                key={p.id}
                className="rounded-lg border border-border p-4 text-sm"
              >
                <div className="flex gap-3">
                  {img ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={img}
                      alt=""
                      className="h-12 w-12 shrink-0 rounded object-cover"
                    />
                  ) : (
                    <div className="h-12 w-12 shrink-0 rounded bg-muted" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{p.nombre}</p>
                    <p className="text-muted-foreground">{p.sku}</p>
                  </div>
                  <Badge variant={p.activo ? "outline" : "secondary"}>
                    {p.activo ? "Activo" : "Inactivo"}
                  </Badge>
                </div>
                <dl className="mt-3 flex flex-col gap-1.5">
                  <div className="flex justify-between gap-2">
                    <dt className="text-muted-foreground">Categoría</dt>
                    <dd>{p.inventario_categorias?.nombre ?? "—"}</dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-muted-foreground">costo</dt>
                    <dd>{formatCop(p.precio)}</dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-muted-foreground">venta</dt>
                    <dd>{formatCop(p.costo ?? 0)}</dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-muted-foreground">Stock</dt>
                    <dd className={lowStock ? "font-medium text-red-700" : ""}>
                      {p.stock}
                      {lowStock && (
                        <Badge variant="destructive" className="ml-2">
                          Bajo
                        </Badge>
                      )}
                    </dd>
                  </div>
                </dl>
                <div className="mt-3 flex gap-2">
                  <PrintPriceLabelButton
                    product={p}
                    variant="outline"
                    className="flex-1"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => {
                      setEditingProd(p);
                      setProdOpen(true);
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
                    <AlertDialogContent className="bg-background">
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
                                router.refresh();
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
            );
          })}
        </div>
          </>
        )}
      </TabsContent>

      <TabsContent value="categorias" className="flex flex-col gap-4">
        <div className="flex justify-end">
          <Button
            onClick={() => {
              setEditingCat(null);
              setCatOpen(true);
            }}
          >
            <Plus data-icon="inline-start" />
            Nueva categoría
          </Button>
        </div>
        <div className="hidden overflow-x-auto rounded-lg border border-border lg:block">
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
                        <AlertDialogContent className="bg-background">
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
                                    router.refresh();
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

        <div className="flex flex-col gap-3 lg:hidden">
          {categorias.map((c) => (
            <div
              key={c.id}
              className="rounded-lg border border-border p-4 text-sm"
            >
              <div className="flex items-start justify-between gap-2">
                <p className="font-medium">{c.nombre}</p>
                <Badge variant={c.activo ? "outline" : "secondary"}>
                  {c.activo ? "Activa" : "Inactiva"}
                </Badge>
              </div>
              <dl className="mt-3 flex flex-col gap-1.5">
                <div className="flex justify-between gap-2">
                  <dt className="text-muted-foreground">Slug</dt>
                  <dd>{c.slug}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-muted-foreground">Orden</dt>
                  <dd>{c.orden}</dd>
                </div>
              </dl>
              <div className="mt-3 flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => {
                    setEditingCat(c);
                    setCatOpen(true);
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
                  <AlertDialogContent className="bg-background">
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
                              router.refresh();
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
              router.refresh();
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
              router.refresh();
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

  useEffect(() => {
    if (open) load();
  }, [open, editing]);

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
    >
      <DialogContent className="bg-background">
        <DialogHeader>
          <DialogTitle>
            {editing ? "Editar categoría" : "Nueva categoría"}
          </DialogTitle>
        </DialogHeader>
        <div className="grid gap-4">
          <Field label="Nombre" value={nombre} onChange={setNombre} />
          <Field label="Slug" value={slug} onChange={setSlug} />
          <Field label="Orden" value={orden} onChange={setOrden} type="number" />
          <div className="flex flex-col gap-2">
            <Label>Descripción</Label>
            <Textarea
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              className="min-h-24 touch-manipulation text-base md:text-sm"
            />
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
            className="bg-primary text-primary-foreground hover:bg-primary/80"
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
    costo: number;
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
  const [costo, setCosto] = useState("0");
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
    setCosto(String(editing?.costo ?? 0));
    setStock(String(editing?.stock ?? 0));
    setStockMinimo(String(editing?.stock_minimo ?? 0));
    setImagenUrl(editing?.imagen_url ?? "");
    setImageFile(null);
    setModelos((editing?.compatible_modelos ?? []).join(", "));
    setActivo(editing?.activo ?? true);
  }

  useEffect(() => {
    if (open) load();
  }, [open, editing]);

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
    >
      <DialogContent className="max-h-[90vh] overflow-y-auto bg-background">
        <DialogHeader>
          <DialogTitle>{editing ? "Editar producto" : "Nuevo producto"}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-2 sm:col-span-2">
            <Label>Categoría</Label>
            <TouchSelect
              aria-label="Categoría"
              value={categoriaId}
              onChange={setCategoriaId}
              options={categorias.map((c) => ({
                value: String(c.id),
                label: c.nombre,
              }))}
            />
          </div>
          <Field label="SKU" value={sku} onChange={setSku} />
          <Field label="Nombre" value={nombre} onChange={setNombre} />
          <Field label="costo" value={precio} onChange={setPrecio} type="number" />
          <Field label="venta" value={costo} onChange={setCosto} type="number" />
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
              enableCamera
              fileInputId="inventario-producto-file"
              cameraInputId="inventario-producto-camera"
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
            <Textarea
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              className="min-h-24 touch-manipulation text-base md:text-sm"
            />
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
            className="bg-primary text-primary-foreground hover:bg-primary/80"
            disabled={pending || !sku.trim() || !nombre.trim() || !categoriaId}
            onClick={() =>
              onSave({
                id: editing?.id,
                categoriaId: Number(categoriaId),
                sku,
                nombre,
                descripcion,
                precio: Number(precio),
                costo: Number(costo),
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
    <div className="flex flex-col gap-2">
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
