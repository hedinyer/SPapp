"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  useTransition,
} from "react";
import { Camera, CameraOff, MessageCircle, ShoppingCart, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { lookupProductoBySku } from "@/lib/actions/venta-actions";
import type { InventarioProductoRow } from "@/lib/pipeline/types";
import {
  cartTotal,
  shareCotizacionWhatsApp,
  type VentaCartLine,
} from "@/lib/printing/print-venta-cotizacion-client";
import { formatCop } from "@/lib/utils/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type CartLine = VentaCartLine & { productoId: number };

type CartAction =
  | { type: "add"; producto: InventarioProductoRow }
  | { type: "clear" };

function cartReducer(state: CartLine[], action: CartAction): CartLine[] {
  if (action.type === "clear") return [];
  const existing = state.find((l) => l.productoId === action.producto.id);
  if (existing) {
    return state.map((l) =>
      l.productoId === action.producto.id
        ? { ...l, cantidad: l.cantidad + 1 }
        : l,
    );
  }
  return [
    ...state,
    {
      productoId: action.producto.id,
      sku: action.producto.sku,
      nombre: action.producto.nombre,
      precioUnitario: action.producto.precio,
      cantidad: 1,
    },
  ];
}

const SCAN_COOLDOWN_MS = 1500;
const SCANNER_ID = "venta-scanner";

export function VentaManager() {
  const [lines, dispatch] = useReducer(cartReducer, []);
  const [cartOpen, setCartOpen] = useState(false);
  const [cameraOn, setCameraOn] = useState(false);
  const [celular, setCelular] = useState("");
  const [manualSku, setManualSku] = useState("");
  const [pending, startTransition] = useTransition();

  const scannerInputRef = useRef<HTMLInputElement>(null);
  const scanLockRef = useRef(false);
  const quaggaRunningRef = useRef(false);

  const total = useMemo(() => cartTotal(lines), [lines]);
  const itemCount = useMemo(
    () => lines.reduce((n, l) => n + l.cantidad, 0),
    [lines],
  );

  const addProduct = useCallback((producto: InventarioProductoRow) => {
    dispatch({ type: "add", producto });
    toast.success(`${producto.nombre} agregado`);
  }, []);

  const resolveSku = useCallback(
    (raw: string) => {
      const sku = raw.trim();
      if (!sku || scanLockRef.current) return;

      scanLockRef.current = true;
      window.setTimeout(() => {
        scanLockRef.current = false;
      }, SCAN_COOLDOWN_MS);

      startTransition(async () => {
        try {
          const producto = await lookupProductoBySku(sku);
          addProduct(producto);
        } catch (e) {
          toast.error(e instanceof Error ? e.message : "Producto no encontrado.");
        }
      });
    },
    [addProduct],
  );

  useEffect(() => {
    if (!cameraOn) {
      if (quaggaRunningRef.current) {
        void import("@ericblade/quagga2").then(({ default: Quagga }) => {
          Quagga.stop();
          quaggaRunningRef.current = false;
        });
      }
      scannerInputRef.current?.focus();
      return;
    }

    let cancelled = false;
    let onDetected: ((result: { codeResult: { code?: string } }) => void) | null =
      null;

    void import("@ericblade/quagga2").then(({ default: Quagga }) => {
      if (cancelled) return;

      const target = document.getElementById(SCANNER_ID);
      if (!target) return;

      onDetected = (result) => {
        if (cancelled || scanLockRef.current) return;
        const code = result.codeResult.code;
        if (code) resolveSku(code);
      };

      Quagga.init(
        {
          inputStream: {
            name: "Live",
            type: "LiveStream",
            target,
            constraints: {
              facingMode: "environment",
              width: { min: 640, ideal: 1920, max: 1920 },
              height: { min: 480, ideal: 1080, max: 1080 },
              // @ts-expect-error focusMode no está en todos los typings
              focusMode: "continuous",
            },
          },
          // Etiquetas 30×20 mm: parches pequeños, sin halfSample.
          locator: { patchSize: "x-small", halfSample: false },
          decoder: { readers: ["code_128_reader"], multiple: false },
          locate: true,
          numOfWorkers: 0,
          frequency: 10,
        },
        (err) => {
          if (cancelled) return;
          if (err) {
            toast.error("No se pudo acceder a la cámara.");
            setCameraOn(false);
            return;
          }
          Quagga.onDetected(onDetected as Parameters<typeof Quagga.onDetected>[0]);
          Quagga.start();
          quaggaRunningRef.current = true;
        },
      );
    });

    return () => {
      cancelled = true;
      void import("@ericblade/quagga2").then(({ default: Quagga }) => {
        if (onDetected) {
          Quagga.offDetected(onDetected as Parameters<typeof Quagga.onDetected>[0]);
        }
        Quagga.stop();
        quaggaRunningRef.current = false;
      });
    };
  }, [cameraOn, resolveSku]);

  function onManualSkuSubmit() {
    resolveSku(manualSku);
    setManualSku("");
  }

  function onScannerKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key !== "Enter") return;
    e.preventDefault();
    const input = e.currentTarget;
    resolveSku(input.value);
    input.value = "";
    input.focus();
  }

  function onWhatsApp() {
    startTransition(async () => {
      try {
        await shareCotizacionWhatsApp(lines, celular);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "No se pudo enviar.");
      }
    });
  }

  return (
    <div className="flex min-h-[calc(100dvh-8rem)] flex-col pb-24">
      <input
        ref={scannerInputRef}
        type="text"
        autoComplete="off"
        aria-label="Escaneo con pistola lectora"
        className="pointer-events-none absolute h-0 w-0 opacity-0"
        onKeyDown={onScannerKeyDown}
        onBlur={() => {
          if (!cameraOn) scannerInputRef.current?.focus();
        }}
      />

      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-neutral-500">
          Escanea la etiqueta impresa (CODE128) o ingresa el SKU.
        </p>
        <Button
          type="button"
          variant={cameraOn ? "default" : "outline"}
          size="sm"
          onClick={() => setCameraOn((v) => !v)}
        >
          {cameraOn ? (
            <>
              <CameraOff className="mr-1.5 h-4 w-4" />
              Apagar cámara
            </>
          ) : (
            <>
              <Camera className="mr-1.5 h-4 w-4" />
              Cámara
            </>
          )}
        </Button>
      </div>

      {cameraOn && (
        <div className="relative mx-auto mt-4 max-w-[280px]">
          <div
            id={SCANNER_ID}
            className="relative min-h-[200px] overflow-hidden rounded-lg border border-neutral-200 bg-black [&_canvas]:!absolute [&_canvas]:!inset-0 [&_video]:!h-full [&_video]:!w-full [&_video]:!object-cover"
          />
          <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
            <div className="h-14 w-[90%] rounded border-2 border-green-400 shadow-[0_0_0_9999px_rgba(0,0,0,0.45)]" />
          </div>
          {pending && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-lg bg-black/30 text-xs text-white">
              Buscando producto…
            </div>
          )}
          <p className="mt-2 text-center text-xs text-neutral-500">
            Acerca la etiqueta impresa (10–15 cm), buena luz, barras horizontales.
          </p>
        </div>
      )}

      <div className="mt-3 flex gap-2">
        <Input
          value={manualSku}
          onChange={(e) => setManualSku(e.target.value.toUpperCase())}
          placeholder="SKU o pistola lectora"
          className="font-mono"
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              onManualSkuSubmit();
            }
          }}
          onFocus={() => {
            if (cameraOn) setCameraOn(false);
          }}
        />
        <Button type="button" variant="outline" onClick={onManualSkuSubmit}>
          Agregar
        </Button>
      </div>

      <div className="mt-6 flex-1 space-y-2">
        {lines.length === 0 ? (
          <p className="rounded-lg border border-dashed border-neutral-200 px-4 py-8 text-center text-sm text-neutral-400">
            El carrito está vacío. Escanea un producto para comenzar.
          </p>
        ) : (
          lines.map((line) => (
            <div
              key={line.productoId}
              className="flex items-center justify-between gap-3 rounded-lg border border-neutral-200 bg-white px-4 py-3"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-neutral-900">
                  {line.nombre}
                </p>
                <p className="text-xs text-neutral-500">
                  {line.cantidad} × {formatCop(line.precioUnitario)}
                </p>
              </div>
              <p className="shrink-0 font-semibold text-neutral-900">
                {formatCop(line.precioUnitario * line.cantidad)}
              </p>
            </div>
          ))
        )}
      </div>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-neutral-200 bg-white px-4 py-3 shadow-[0_-4px_12px_rgba(0,0,0,0.06)]">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4">
          <div>
            <p className="text-xs text-neutral-500">Total</p>
            <p className="text-xl font-bold text-neutral-900">
              {formatCop(total)}
            </p>
          </div>
          <Button
            type="button"
            size="lg"
            className="relative"
            onClick={() => setCartOpen(true)}
          >
            <ShoppingCart className="mr-2 h-5 w-5" />
            Carrito
            {itemCount > 0 && (
              <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-xs font-bold text-white">
                {itemCount}
              </span>
            )}
          </Button>
        </div>
      </div>

      <Sheet open={cartOpen} onOpenChange={setCartOpen}>
        <SheetContent side="bottom" className="max-h-[85dvh] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Detalle del carrito</SheetTitle>
          </SheetHeader>

          {lines.length === 0 ? (
            <p className="px-4 text-sm text-neutral-500">Sin productos.</p>
          ) : (
            <>
              <div className="hidden px-4 sm:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Producto</TableHead>
                      <TableHead>SKU</TableHead>
                      <TableHead className="text-center">Cant.</TableHead>
                      <TableHead className="text-right">P. unit.</TableHead>
                      <TableHead className="text-right">Subtotal</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {lines.map((line) => (
                      <TableRow key={line.productoId}>
                        <TableCell>{line.nombre}</TableCell>
                        <TableCell className="font-mono text-xs">
                          {line.sku}
                        </TableCell>
                        <TableCell className="text-center">
                          {line.cantidad}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCop(line.precioUnitario)}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCop(line.precioUnitario * line.cantidad)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="space-y-3 px-4 sm:hidden">
                {lines.map((line) => (
                  <div
                    key={line.productoId}
                    className="rounded-lg border border-neutral-200 p-3 text-sm"
                  >
                    <p className="font-medium">{line.nombre}</p>
                    <p className="text-xs text-neutral-500">{line.sku}</p>
                    <p className="mt-1">
                      {line.cantidad} × {formatCop(line.precioUnitario)} ={" "}
                      {formatCop(line.precioUnitario * line.cantidad)}
                    </p>
                  </div>
                ))}
              </div>

              <div className="px-4 text-right">
                <p className="text-lg font-bold">Total: {formatCop(total)}</p>
              </div>
            </>
          )}

          <SheetFooter className="gap-3">
            <div className="w-full space-y-2">
              <Label htmlFor="venta-celular">Celular del cliente</Label>
              <Input
                id="venta-celular"
                type="tel"
                inputMode="numeric"
                placeholder="3001234567"
                value={celular}
                onChange={(e) => setCelular(e.target.value)}
              />
            </div>
            <div className="flex w-full flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={lines.length === 0 || pending}
                onClick={() => dispatch({ type: "clear" })}
              >
                <Trash2 className="mr-1.5 h-4 w-4" />
                Vaciar
              </Button>
              <Button
                type="button"
                className="flex-1 bg-green-600 text-white hover:bg-green-700"
                disabled={lines.length === 0 || pending}
                onClick={onWhatsApp}
              >
                <MessageCircle className="mr-1.5 h-4 w-4" />
                Enviar por WhatsApp
              </Button>
            </div>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}
