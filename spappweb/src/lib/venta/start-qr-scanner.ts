import QrScanner from "qr-scanner";

export type QrScannerStop = () => void;

function isCoarsePointer(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(pointer: coarse)").matches
  );
}

export function isMobileTouchDevice(): boolean {
  return isCoarsePointer();
}

export function cameraErrorMessage(err: unknown): string {
  const name =
    err instanceof DOMException
      ? err.name
      : err instanceof Error
        ? err.name
        : "";
  const msg =
    err instanceof Error
      ? err.message
      : typeof err === "string"
        ? err
        : String(err);
  if (
    name === "NotAllowedError" ||
    /not allowed|permission denied/i.test(msg)
  ) {
    return "Permite el acceso a la cámara cuando el navegador lo pida.";
  }
  if (!window.isSecureContext) {
    return "La cámara solo funciona con HTTPS (o localhost).";
  }
  if (
    name === "NotFoundError" ||
    /not found|no camera|camera not found/i.test(msg)
  ) {
    return "No se encontró cámara en este dispositivo.";
  }
  return "No se pudo acceder a la cámara. Toca Cámara e intenta de nuevo.";
}

function prepareScannerMount(container: HTMLElement): void {
  Object.assign(container.style, {
    width: "100%",
    height: "100%",
    minHeight: "0",
    position: "relative",
    overflow: "hidden",
    background: "#000",
  });
}

function createPreviewVideo(): HTMLVideoElement {
  const video = document.createElement("video");
  video.playsInline = true;
  video.setAttribute("playsinline", "true");
  video.setAttribute("webkit-playsinline", "true");
  video.muted = true;
  video.autoplay = true;
  Object.assign(video.style, {
    position: "absolute",
    inset: "0",
    width: "100%",
    height: "100%",
    objectFit: "cover",
    display: "block",
    zIndex: "1",
    transform: "translateZ(0)",
    WebkitTransform: "translateZ(0)",
  });
  return video;
}

/** Escanea el frame completo (etiquetas con texto alrededor del QR). */
function fullFrameScanRegion(video: HTMLVideoElement): QrScanner.ScanRegion {
  const width = video.videoWidth;
  const height = video.videoHeight;
  const downScaledWidth = 640;
  if (!width || !height) {
    return { downScaledWidth, downScaledHeight: downScaledWidth };
  }
  return {
    x: 0,
    y: 0,
    width,
    height,
    downScaledWidth,
    downScaledHeight: Math.round((downScaledWidth * height) / width),
  };
}

function guideBoxPx(container: HTMLElement, mobile: boolean): number {
  const rect = container.getBoundingClientRect();
  const base = Math.min(rect.width || 320, rect.height || 420);
  if (mobile) {
    return Math.max(80, Math.min(108, Math.floor(base * 0.28)));
  }
  return Math.max(96, Math.min(132, Math.floor(base * 0.24)));
}

function addScanOverlay(container: HTMLElement, mobile: boolean): void {
  container.style.position = "relative";

  const existing = container.querySelector("[data-qr-guide]");
  existing?.remove();

  const overlay = document.createElement("div");
  overlay.setAttribute("data-qr-guide", "true");
  Object.assign(overlay.style, {
    position: "absolute",
    inset: "0",
    pointerEvents: "none",
    zIndex: "2",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  });

  const size = guideBoxPx(container, mobile);
  const hole = document.createElement("div");
  Object.assign(hole.style, {
    width: `${size}px`,
    height: `${size}px`,
    boxShadow: "0 0 0 9999px rgba(0, 0, 0, 0.5)",
    border: "2px solid rgba(255, 255, 255, 0.92)",
    borderRadius: "8px",
    boxSizing: "border-box",
  });

  overlay.appendChild(hole);
  container.appendChild(overlay);
}

function whenVideoReady(container: HTMLElement, fn: () => void): void {
  const video = container.querySelector("video");
  if (video instanceof HTMLVideoElement && video.readyState >= 2) {
    fn();
    return;
  }
  video?.addEventListener("loadeddata", () => fn(), { once: true });
  window.setTimeout(fn, 400);
}

async function startQrScannerImpl(
  container: HTMLElement,
  onCode: (code: string) => void,
  locked: () => boolean,
): Promise<QrScannerStop> {
  if (!window.isSecureContext) {
    throw new DOMException("Secure context required", "SecurityError");
  }

  const mobile = isCoarsePointer();
  prepareScannerMount(container);

  const video = createPreviewVideo();
  container.replaceChildren(video);

  const scanner = new QrScanner(
    video,
    (result) => {
      if (locked()) return;
      const raw = result.data?.trim();
      if (raw) onCode(raw);
    },
    {
      returnDetailedScanResult: true,
      preferredCamera: "environment",
      maxScansPerSecond: mobile ? 10 : 15,
      calculateScanRegion: fullFrameScanRegion,
      onDecodeError: (error) => {
        if (error === QrScanner.NO_QR_CODE_FOUND) return;
      },
    },
  );

  try {
    await scanner.start();
  } catch (error) {
    scanner.destroy();
    throw error;
  }

  whenVideoReady(container, () => addScanOverlay(container, mobile));

  return () => {
    scanner.destroy();
    container.replaceChildren();
  };
}

export async function startQrScanner(
  container: HTMLElement,
  onCode: (code: string) => void,
  locked: () => boolean,
): Promise<QrScannerStop> {
  return startQrScannerImpl(container, onCode, locked);
}
