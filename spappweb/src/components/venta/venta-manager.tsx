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
import {
  cameraErrorMessage,
  startQrScanner,
} from "@/lib/venta/start-qr-scanner";

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

const SCAN_COOLDOWN_SEC = 5;
const SCANNER_ID = "venta-scanner";

function isTouchDevice(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(pointer: coarse)").matches
  );
}

export function VentaManager() {
  const [lines, dispatch] = useReducer(cartReducer, []);
  const [cartOpen, setCartOpen] = useState(false);
  const [cameraOn, setCameraOn] = useState(false);
  const [celular, setCelular] = useState("");
  const [manualSku, setManualSku] = useState("");
  const [cooldownSec, setCooldownSec] = useState(0);
  const [pending, startTransition] = useTransition();

  const scannerInputRef = useRef<HTMLInputElement>(null);
  const scannerContainerRef = useRef<HTMLDivElement>(null);
  const scanLockRef = useRef(false);
  const stopScannerRef = useRef<(() => void) | null>(null);
  const onCodeRef = useRef<(code: string) => void>(() => {});
  const cooldownTimerRef = useRef<number | null>(null);

  const total = useMemo(() => cartTotal(lines), [lines]);
  const itemCount = useMemo(
    () => lines.reduce((n, l) => n + l.cantidad, 0),
    [lines],
  );

  const addProduct = useCallback((producto: InventarioProductoRow) => {
    dispatch({ type: "add", producto });
    toast.success(`${producto.nombre} agregado`);
  }, []);

  const startCooldown = useCallback(() => {
    if (cooldownTimerRef.current) {
      window.clearInterval(cooldownTimerRef.current);
    }

    scanLockRef.current = true;
    setCooldownSec(SCAN_COOLDOWN_SEC);

    cooldownTimerRef.current = window.setInterval(() => {
      setCooldownSec((prev) => {
        if (prev <= 1) {
          if (cooldownTimerRef.current) {
            window.clearInterval(cooldownTimerRef.current);
            cooldownTimerRef.current = null;
          }
          scanLockRef.current = false;
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  const lookupAndAdd = useCallback(
    (sku: string) => {
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

  const resolveSkuFromCamera = useCallback(
    (raw: string) => {
      const sku = raw.trim();
      if (!sku || scanLockRef.current) return;
      startCooldown();
      lookupAndAdd(sku);
    },
    [lookupAndAdd, startCooldown],
  );
  onCodeRef.current = resolveSkuFromCamera;

  const stopCamera = useCallback(() => {
    stopScannerRef.current?.();
    stopScannerRef.current = null;
    setCameraOn(false);
  }, []);

  const startCamera = useCallback(async () => {
    if (stopScannerRef.current) return;

    scannerInputRef.current?.blur();
    setCameraOn(true);

    const container = scannerContainerRef.current;
    if (!container) {
      toast.error("No se pudo acceder a la cámara.");
      setCameraOn(false);
      return;
    }

    try {
      stopScannerRef.current = await startQrScanner(
        container,
        (code) => onCodeRef.current(code),
        () => scanLockRef.current,
      );
    } catch (err) {
      toast.error(cameraErrorMessage(err));
      setCameraOn(false);
    }
  }, []);

  const toggleCamera = useCallback(async () => {
    if (cameraOn) {
      stopCamera();
      return;
    }
    await startCamera();
  }, [cameraOn, startCamera, stopCamera]);

  const resolveSkuManual = useCallback(
    (raw: string) => {
      const sku = raw.trim();
      if (!sku) return;
      lookupAndAdd(sku);
    },
    [lookupAndAdd],
  );

  useEffect(() => {
    return () => {
      if (cooldownTimerRef.current) {
        window.clearInterval(cooldownTimerRef.current);
      }
      stopScannerRef.current?.();
    };
  }, []);

  useEffect(() => {
    if (!cameraOn && !isTouchDevice()) scannerInputRef.current?.focus();
  }, [cameraOn]);

  function onManualSkuSubmit() {
    resolveSkuManual(manualSku);
    setManualSku("");
  }

  function onScannerKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key !== "Enter") return;
    e.preventDefault();
    const input = e.currentTarget;
    resolveSkuManual(input.value);
    input.value = "";
    if (!isTouchDevice()) input.focus();
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
        inputMode="none"
        tabIndex={-1}
        aria-label="Escaneo con pistola lectora"
        className="pointer-events-none absolute h-0 w-0 opacity-0"
        onKeyDown={onScannerKeyDown}
        onBlur={() => {
          if (!cameraOn && !isTouchDevice()) scannerInputRef.current?.focus();
        }}
      />

      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-neutral-500">
          Escanea el QR de la etiqueta impresa o ingresa el SKU.
        </p>
        <Button
          type="button"
          variant={cameraOn ? "default" : "outline"}
          size="sm"
          onClick={() => void toggleCamera()}
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

      <div className="relative mx-auto mt-4 w-full max-w-[320px]">
        <div className="relative aspect-[4/3] w-full overflow-hidden rounded-lg border border-neutral-200 bg-black">
          <div
            id={SCANNER_ID}
            ref={scannerContainerRef}
            className="absolute inset-0 [&_#qr-shaded-region]:hidden [&_video]:!absolute [&_video]:!inset-0 [&_video]:!h-full [&_video]:!w-full [&_video]:!object-cover"
          />
          {!cameraOn ? (
            <button
              type="button"
              className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 bg-neutral-100 p-4 text-neutral-600 active:bg-neutral-200/80"
              onClick={() => void startCamera()}
            >
              <Camera className="h-10 w-10" />
              <span className="text-sm font-medium">
                Toca para activar la cámara
              </span>
            </button>
          ) : null}
          {cooldownSec > 0 && (
            <div className="pointer-events-none absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/60 text-white">
              <span className="text-5xl font-bold tabular-nums">{cooldownSec}</span>
              <span className="mt-1 text-sm">Espera para escanear de nuevo</span>
            </div>
          )}
          {pending && cooldownSec === 0 && cameraOn && (
            <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center bg-black/30 text-xs text-white">
              Buscando producto…
            </div>
          )}
        </div>
        {cameraOn ? (
          <p className="mt-2 text-center text-xs text-neutral-500">
            Apunta al QR desde cualquier ángulo o distancia; no hace falta centrarlo perfecto.
          </p>
        ) : null}
      </div>

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
            if (cameraOn) stopCamera();
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
