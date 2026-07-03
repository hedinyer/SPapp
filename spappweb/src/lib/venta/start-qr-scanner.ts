import QrScanner from "qr-scanner";

export type QrScannerStop = () => void;

type NativeDetector = {
  detect: (source: ImageBitmapSource) => Promise<Array<{ rawValue?: string }>>;
};

function isCoarsePointer(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(pointer: coarse)").matches
  );
}

export function isMobileTouchDevice(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(pointer: coarse)").matches ||
    window.matchMedia("(max-width: 639px)").matches
  );
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
    objectFit: "contain",
    display: "block",
    zIndex: "1",
  });
  return video;
}

function fullFrameRegion(video: HTMLVideoElement): QrScanner.ScanRegion {
  const { videoWidth: w, videoHeight: h } = video;
  if (w < 2 || h < 2) return {};
  return { x: 0, y: 0, width: w, height: h };
}

function addScanOverlay(container: HTMLElement): void {
  container.querySelector("[data-qr-guide]")?.remove();
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
  const hole = document.createElement("div");
  Object.assign(hole.style, {
    width: "42%",
    maxWidth: "220px",
    aspectRatio: "1",
    boxShadow: "0 0 0 9999px rgba(0,0,0,0.4)",
    border: "2px solid rgba(255,255,255,0.85)",
    borderRadius: "10px",
  });
  overlay.appendChild(hole);
  container.appendChild(overlay);
}

function stopStream(stream: MediaStream | null): void {
  stream?.getTracks().forEach((t) => t.stop());
}

async function acquireCamera(mobile: boolean): Promise<MediaStream> {
  const tuned = {
    facingMode: { ideal: "environment" },
    width: { ideal: mobile ? 1920 : 2560 },
    height: { ideal: mobile ? 1080 : 1440 },
    focusMode: { ideal: "continuous" },
    exposureMode: { ideal: "continuous" },
    whiteBalanceMode: { ideal: "continuous" },
  } as MediaTrackConstraints;

  for (const video of [
    tuned,
    { facingMode: { ideal: "environment" }, width: { ideal: 1280 } },
    { facingMode: "environment" },
    true,
  ]) {
    try {
      return await navigator.mediaDevices.getUserMedia({ audio: false, video });
    } catch {
      /* siguiente intento */
    }
  }
  throw new Error("Camera not found.");
}

async function tuneTrack(stream: MediaStream): Promise<void> {
  const track = stream.getVideoTracks()[0];
  if (!track) return;
  try {
    await track.applyConstraints({
      advanced: [
        { focusMode: "continuous" },
        { exposureMode: "continuous" },
        { whiteBalanceMode: "continuous" },
      ],
    } as unknown as MediaTrackConstraints);
  } catch {
    /* no soportado */
  }
}

type ScanEngine = Awaited<ReturnType<typeof QrScanner.createQrEngine>>;

function readScanEngine(scanner: QrScanner): Promise<ScanEngine> {
  type Internal = { _qrEnginePromise: Promise<ScanEngine> };
  return (scanner as unknown as Internal)._qrEnginePromise;
}

async function createWorkerBackup(video: HTMLVideoElement): Promise<{
  engine: ScanEngine;
  canvas: HTMLCanvasElement;
  release: () => void;
}> {
  const holder = new QrScanner(video, () => {}, {
    returnDetailedScanResult: true,
  });
  holder.setInversionMode("both");
  const engine = await readScanEngine(holder);
  return { engine, canvas: holder.$canvas, release: () => holder.destroy() };
}

async function decodeFrame(
  video: HTMLVideoElement,
  detector: NativeDetector | null,
  worker: { engine: ScanEngine; canvas: HTMLCanvasElement } | null,
): Promise<string | null> {
  if (detector) {
    try {
      const hits = await detector.detect(video);
      const raw = hits[0]?.rawValue?.trim();
      if (raw) return raw;
    } catch {
      /* native falló; prueba worker en móvil */
    }
  }
  if (!worker) return null;
  try {
    const result = await QrScanner.scanImage(video, {
      scanRegion: fullFrameRegion(video),
      qrEngine: worker.engine,
      canvas: worker.canvas,
      alsoTryWithoutScanRegion: true,
      returnDetailedScanResult: true,
    });
    return result.data?.trim() ?? null;
  } catch {
    return null;
  }
}

/** Chrome/Samsung Android + Safari iOS: detección nativa del SO, frame completo. */
async function nativeDetector(): Promise<NativeDetector | null> {
  type BD = (new (opts: { formats: string[] }) => NativeDetector) & {
    getSupportedFormats: () => Promise<string[]>;
  };
  const BD = (globalThis as { BarcodeDetector?: BD }).BarcodeDetector;
  if (!BD) return null;
  try {
    const formats = await BD.getSupportedFormats();
    if (!formats.includes("qr_code")) return null;
    return new BD({ formats: ["qr_code"] });
  } catch {
    return null;
  }
}

function scanLoop(
  video: HTMLVideoElement,
  locked: () => boolean,
  onCode: (code: string) => void,
  decode: () => Promise<string | null>,
): () => void {
  let active = true;
  let busy = false;
  const SCAN_INTERVAL_MS = 100;

  const id = window.setInterval(() => {
    if (!active || busy || video.readyState < 2 || locked()) return;
    busy = true;
    void decode()
      .then((raw) => {
        if (raw && !locked()) onCode(raw);
      })
      .finally(() => {
        busy = false;
      });
  }, SCAN_INTERVAL_MS);

  return () => {
    active = false;
    window.clearInterval(id);
  };
}

async function startQrScannerImpl(
  container: HTMLElement,
  onCode: (code: string) => void,
  locked: () => boolean,
): Promise<QrScannerStop> {
  if (!window.isSecureContext) {
    throw new DOMException("Secure context required", "SecurityError");
  }
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error("Camera not found.");
  }

  const mobile = isCoarsePointer();
  prepareScannerMount(container);
  const video = createPreviewVideo();
  container.replaceChildren(video);

  const stream = await acquireCamera(mobile);
  video.srcObject = stream;
  try {
    await video.play();
    await tuneTrack(stream);
  } catch (err) {
    stopStream(stream);
    throw err;
  }

  const detector = await nativeDetector();
  const workerBackup =
    mobile || !detector ? await createWorkerBackup(video) : null;

  let stopLoop: () => void;
  let releaseScanner: (() => void) | undefined;

  if (detector || workerBackup) {
    stopLoop = scanLoop(video, locked, onCode, () =>
      decodeFrame(
        video,
        detector,
        workerBackup
          ? { engine: workerBackup.engine, canvas: workerBackup.canvas }
          : null,
      ),
    );
    releaseScanner = workerBackup?.release;
  } else {
    const scanner = new QrScanner(
      video,
      (result) => {
        if (locked()) return;
        const raw = result.data?.trim();
        if (raw) onCode(raw);
      },
      {
        returnDetailedScanResult: true,
        maxScansPerSecond: 10,
        calculateScanRegion: fullFrameRegion,
        onDecodeError: (e) => {
          if (e === QrScanner.NO_QR_CODE_FOUND) return;
        },
      },
    );
    scanner.setInversionMode("both");
    await scanner.start();
    stopLoop = () => scanner.stop();
    releaseScanner = () => scanner.destroy();
  }

  video.addEventListener("loadeddata", () => addScanOverlay(container), {
    once: true,
  });
  window.setTimeout(() => addScanOverlay(container), 400);

  return () => {
    stopLoop();
    releaseScanner?.();
    stopStream(video.srcObject instanceof MediaStream ? video.srcObject : null);
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
