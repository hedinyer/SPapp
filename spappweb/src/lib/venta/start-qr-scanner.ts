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
  video.muted = true;
  video.autoplay = true;
  Object.assign(video.style, {
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
  const { Html5Qrcode, Html5QrcodeSupportedFormats } = await import(
    "html5-qrcode"
  );
  if (!container.id) container.id = `qr-${crypto.randomUUID()}`;

  const scanner = new Html5Qrcode(container.id, {
    formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
    verbose: false,
    useBarCodeDetectorIfSupported: false,
  });

  await scanner.start(
    { facingMode: "environment" },
    {
      fps: 20,
      // ponytail: frame completo — el QR se encuentra aunque la etiqueta traiga texto arriba/abajo
      qrbox: (w, h) => ({ width: w, height: h }),
      disableFlip: false,
    },
    (text) => {
      const raw = text.trim();
      if (raw && !locked()) onCode(raw);
    },
    () => {},
  );

  return () => {
    void scanner.stop().catch(() => {});
    scanner.clear();
  };
}

export async function startQrScanner(
  container: HTMLElement,
  onCode: (code: string) => void,
  locked: () => boolean,
): Promise<QrScannerStop> {
  if (!isCoarsePointer() && window.BarcodeDetector) {
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
