import {
  Html5Qrcode,
  Html5QrcodeSupportedFormats,
} from "html5-qrcode";

export type QrScannerStop = () => void;

type BarcodeDetectorLike = {
  detect: (source: ImageBitmapSource) => Promise<{ rawValue?: string }[]>;
};

declare global {
  interface Window {
    BarcodeDetector?: {
      new (opts: { formats: string[] }): BarcodeDetectorLike;
      getSupportedFormats: () => Promise<string[]>;
    };
  }
}

/** Marco guía (etiqueta 30×20 mm). La detección usa el frame completo. */
const GUIDE_WIDTH_RATIO = 0.75;
const GUIDE_HEIGHT_RATIO = 0.5;

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
  const msg = err instanceof Error ? err.message : String(err);
  if (
    name === "NotAllowedError" ||
    /not allowed|permission denied/i.test(msg)
  ) {
    return "Permite el acceso a la cámara cuando el navegador lo pida.";
  }
  if (!window.isSecureContext) {
    return "La cámara solo funciona con HTTPS (o localhost).";
  }
  if (name === "NotFoundError" || /not found|no camera/i.test(msg)) {
    return "No se encontró cámara en este dispositivo.";
  }
  return "No se pudo acceder a la cámara. Toca Cámara e intenta de nuevo.";
}

async function getCameraStream(): Promise<MediaStream> {
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error("Camera API not available");
  }

  const attempts: MediaStreamConstraints[] = [
    { video: { facingMode: { ideal: "environment" } }, audio: false },
    { video: { facingMode: "environment" }, audio: false },
    { video: { facingMode: "user" }, audio: false },
    { video: true, audio: false },
  ];

  let lastError: unknown;
  for (const constraints of attempts) {
    try {
      return await navigator.mediaDevices.getUserMedia(constraints);
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError;
}

function addScanOverlay(container: HTMLElement): HTMLElement {
  container.style.position = "relative";

  const overlay = document.createElement("div");
  Object.assign(overlay.style, {
    position: "absolute",
    inset: "0",
    pointerEvents: "none",
    zIndex: "2",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  });

  const hole = document.createElement("div");
  Object.assign(hole.style, {
    width: `${GUIDE_WIDTH_RATIO * 100}%`,
    height: `${GUIDE_HEIGHT_RATIO * 100}%`,
    maxWidth: "240px",
    maxHeight: "160px",
    boxShadow: "0 0 0 9999px rgba(0,0,0,0.55)",
    border: "2px solid rgba(255,255,255,0.9)",
    borderRadius: "10px",
    boxSizing: "border-box",
  });

  overlay.appendChild(hole);
  container.appendChild(overlay);
  return overlay;
}

function styleScannerVideo(container: HTMLElement): void {
  const video = container.querySelector("video");
  if (video instanceof HTMLVideoElement) {
    Object.assign(video.style, {
      position: "absolute",
      inset: "0",
      width: "100%",
      height: "100%",
      objectFit: "cover",
    });
  }
}

function drawFullFrame(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  video: HTMLVideoElement,
  rotationDeg: number,
): void {
  const vw = video.videoWidth;
  const vh = video.videoHeight;
  if (!vw || !vh) return;

  const rot90 = rotationDeg === 90 || rotationDeg === 270;
  canvas.width = rot90 ? vh : vw;
  canvas.height = rot90 ? vw : vh;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (rotationDeg === 0) {
    ctx.drawImage(video, 0, 0, vw, vh);
    return;
  }

  const rad = (rotationDeg * Math.PI) / 180;
  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.rotate(rad);
  ctx.drawImage(video, -vw / 2, -vh / 2, vw, vh);
}

async function startNative(
  container: HTMLElement,
  onCode: (code: string) => void,
  locked: () => boolean,
): Promise<QrScannerStop> {
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
  });
  container.replaceChildren(video);

  const stream = await getCameraStream();
  video.srcObject = stream;
  await video.play();

  addScanOverlay(container);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not supported");

  const detector = new window.BarcodeDetector!({ formats: ["qr_code"] });
  const rotations = [0, 90, 180, 270];
  let alive = true;
  let busy = false;
  let raf = 0;
  let rotationIndex = 0;

  const tick = () => {
    if (!alive) return;
    raf = requestAnimationFrame(tick);
    if (busy || locked() || video.readyState < video.HAVE_ENOUGH_DATA) return;

    busy = true;
    const rotation = rotations[rotationIndex % rotations.length]!;
    rotationIndex += 1;

    drawFullFrame(ctx, canvas, video, rotation);
    void detector
      .detect(canvas)
      .then((codes) => {
        const raw = codes[0]?.rawValue?.trim();
        if (raw && !locked()) {
          rotationIndex = 0;
          onCode(raw);
        }
      })
      .catch(() => {})
      .finally(() => {
        busy = false;
      });
  };
  raf = requestAnimationFrame(tick);

  return () => {
    alive = false;
    cancelAnimationFrame(raf);
    stream.getTracks().forEach((t) => t.stop());
    container.replaceChildren();
  };
}

async function startHtml5(
  container: HTMLElement,
  onCode: (code: string) => void,
  locked: () => boolean,
): Promise<QrScannerStop> {
  if (!window.isSecureContext) {
    throw new DOMException("Secure context required", "SecurityError");
  }

  const mobile = isCoarsePointer();
  const scanConfig = {
    fps: mobile ? 10 : 15,
    disableFlip: false,
    qrbox: mobile
      ? { width: 220, height: 220 }
      : (viewfinderWidth: number, viewfinderHeight: number) => ({
          width: Math.floor(Math.min(viewfinderWidth * 0.8, 240)),
          height: Math.floor(Math.min(viewfinderHeight * 0.5, 180)),
        }),
  };

  const cameraAttempts: MediaTrackConstraints[] = [
    { facingMode: "environment" },
    { facingMode: "user" },
  ];

  let lastError: unknown;

  for (const camera of cameraAttempts) {
    container.replaceChildren();
    const id = `qr-${crypto.randomUUID()}`;
    container.id = id;

    const scanner = new Html5Qrcode(id, {
      formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
      verbose: false,
      useBarCodeDetectorIfSupported: false,
    });

    try {
      await scanner.start(
        camera,
        scanConfig,
        (text) => {
          const raw = text.trim();
          if (raw && !locked()) onCode(raw);
        },
        () => {},
      );

      styleScannerVideo(container);
      addScanOverlay(container);

      return () => {
        void scanner.stop().catch(() => {});
        scanner.clear();
        container.replaceChildren();
      };
    } catch (error) {
      lastError = error;
      try {
        await scanner.stop();
      } catch {
        // ignore
      }
      scanner.clear();
    }
  }

  throw lastError ?? new Error("Camera start failed");
}

export async function startQrScanner(
  container: HTMLElement,
  onCode: (code: string) => void,
  locked: () => boolean,
): Promise<QrScannerStop> {
  if (!window.isSecureContext) {
    throw new DOMException("Secure context required", "SecurityError");
  }

  // ponytail: sin await antes de getUserMedia — iOS exige gesto del usuario
  if (isCoarsePointer()) {
    try {
      return await startHtml5(container, onCode, locked);
    } catch {
      container.replaceChildren();
    }

    if (window.BarcodeDetector) {
      try {
        const formats = await window.BarcodeDetector.getSupportedFormats();
        if (formats.includes("qr_code")) {
          return await startNative(container, onCode, locked);
        }
      } catch {
        container.replaceChildren();
      }
    }

    throw new Error("Camera unavailable on mobile");
  }

  if (window.BarcodeDetector) {
    try {
      const formats = await window.BarcodeDetector.getSupportedFormats();
      if (formats.includes("qr_code")) {
        try {
          return await startNative(container, onCode, locked);
        } catch {
          container.replaceChildren();
        }
      }
    } catch {
      container.replaceChildren();
    }
  }

  return startHtml5(container, onCode, locked);
}
