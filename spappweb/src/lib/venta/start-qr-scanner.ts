import QrScanner from "qr-scanner";

export type QrScannerStop = () => void;

type ScanEngine = Awaited<ReturnType<typeof QrScanner.createQrEngine>>;

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
    // contain = ve todo el sensor; mejor si el QR no está centrado o hay texto alrededor
    objectFit: "contain",
    display: "block",
    zIndex: "1",
    transform: "translateZ(0)",
    WebkitTransform: "translateZ(0)",
  });
  return video;
}

function scanScaleCaps(mobile: boolean): number[] {
  return mobile ? [1280, 960, 720] : [1920, 1280, 960];
}

function buildScanRegion(
  video: HTMLVideoElement,
  downScaledWidth: number,
): QrScanner.ScanRegion {
  const width = video.videoWidth;
  const height = video.videoHeight;
  if (!width || !height) {
    return { downScaledWidth, downScaledHeight: downScaledWidth };
  }
  const w = Math.min(downScaledWidth, width);
  return {
    x: 0,
    y: 0,
    width,
    height,
    downScaledWidth: w,
    downScaledHeight: Math.round((w * height) / width),
  };
}

function guideBoxPx(container: HTMLElement, mobile: boolean): number {
  const rect = container.getBoundingClientRect();
  const base = Math.min(rect.width || 320, rect.height || 420);
  if (mobile) {
    return Math.max(120, Math.min(180, Math.floor(base * 0.42)));
  }
  return Math.max(140, Math.min(220, Math.floor(base * 0.38)));
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
    boxShadow: "0 0 0 9999px rgba(0, 0, 0, 0.45)",
    border: "2px solid rgba(255, 255, 255, 0.88)",
    borderRadius: "10px",
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

function stopStream(stream: MediaStream | null): void {
  if (!stream) return;
  for (const track of stream.getTracks()) {
    track.stop();
    stream.removeTrack(track);
  }
}

async function acquireBestCameraStream(mobile: boolean): Promise<MediaStream> {
  const highResVideo = {
    facingMode: { ideal: "environment" },
    width: { ideal: mobile ? 1920 : 2560, min: 1280 },
    height: { ideal: mobile ? 1080 : 1440, min: 720 },
    focusMode: { ideal: "continuous" },
    exposureMode: { ideal: "continuous" },
    whiteBalanceMode: { ideal: "continuous" },
  } as MediaTrackConstraints;

  const midResVideo = {
    facingMode: { ideal: "environment" },
    width: { ideal: 1280 },
    height: { ideal: 720 },
    focusMode: { ideal: "continuous" },
  } as MediaTrackConstraints;

  const attempts: MediaStreamConstraints[] = [
    { audio: false, video: highResVideo },
    { audio: false, video: midResVideo },
    { audio: false, video: { facingMode: "environment" } },
    { audio: false, video: { facingMode: "user" } },
    { audio: false, video: true },
  ];

  let lastError: unknown;
  for (const constraints of attempts) {
    try {
      return await navigator.mediaDevices.getUserMedia(constraints);
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError ?? new Error("Camera start failed");
}

async function tuneCameraTrack(stream: MediaStream): Promise<void> {
  const track = stream.getVideoTracks()[0];
  if (!track) return;

  type AdvancedConstraint = MediaTrackConstraintSet & {
    focusMode?: string;
    exposureMode?: string;
    whiteBalanceMode?: string;
  };

  const advanced: AdvancedConstraint[] = [
    { focusMode: "continuous" },
    { exposureMode: "continuous" },
    { whiteBalanceMode: "continuous" },
  ];

  try {
    await track.applyConstraints({ advanced } as MediaTrackConstraints);
  } catch {
    // Algunos navegadores no soportan estos modos.
  }
}

/** qr-scanner crea el engine en el constructor; lo reutilizamos sin llamar start(). */
async function createTunedEngine(video: HTMLVideoElement): Promise<{
  engine: ScanEngine;
  canvas: HTMLCanvasElement;
  release: () => void;
}> {
  const holder = new QrScanner(video, () => {}, {
    returnDetailedScanResult: true,
  });
  holder.setInversionMode("both");

  type Internal = { _qrEnginePromise: Promise<ScanEngine> };
  const engine = await (holder as unknown as Internal)._qrEnginePromise;

  return {
    engine,
    canvas: holder.$canvas,
    release: () => holder.destroy(),
  };
}

async function decodeFrameRobust(
  video: HTMLVideoElement,
  engine: ScanEngine,
  canvas: HTMLCanvasElement,
  mobile: boolean,
): Promise<string | null> {
  if (video.videoWidth < 2 || video.videoHeight < 2) return null;

  for (const cap of scanScaleCaps(mobile)) {
    const scanRegion = buildScanRegion(video, cap);
    try {
      const result = await QrScanner.scanImage(video, {
        scanRegion,
        qrEngine: engine,
        canvas,
        alsoTryWithoutScanRegion: true,
        returnDetailedScanResult: true,
      });
      const raw = result.data?.trim();
      if (raw) return raw;
    } catch (error) {
      if (error !== QrScanner.NO_QR_CODE_FOUND) continue;
    }
  }
  return null;
}

function startRobustScanLoop(
  video: HTMLVideoElement,
  engine: ScanEngine,
  canvas: HTMLCanvasElement,
  mobile: boolean,
  locked: () => boolean,
  onCode: (code: string) => void,
): () => void {
  let active = true;
  let busy = false;
  let lastScanAt = 0;
  const minIntervalMs = mobile ? 65 : 45;

  const schedule =
    typeof video.requestVideoFrameCallback === "function"
      ? (cb: () => void) => video.requestVideoFrameCallback(() => cb())
      : (cb: () => void) => requestAnimationFrame(() => cb());

  const tick = () => {
    if (!active) return;
    schedule(tick);

    if (busy || video.readyState < 2 || locked()) return;

    const now = Date.now();
    if (now - lastScanAt < minIntervalMs) return;
    lastScanAt = now;
    busy = true;

    void decodeFrameRobust(video, engine, canvas, mobile)
      .then((raw) => {
        if (raw && !locked()) onCode(raw);
      })
      .finally(() => {
        busy = false;
      });
  };

  schedule(tick);
  return () => {
    active = false;
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

  const stream = await acquireBestCameraStream(mobile);
  video.srcObject = stream;

  try {
    await video.play();
    await tuneCameraTrack(stream);
  } catch (error) {
    stopStream(stream);
    throw error;
  }

  const { engine, canvas, release } = await createTunedEngine(video);
  const stopLoop = startRobustScanLoop(
    video,
    engine,
    canvas,
    mobile,
    locked,
    onCode,
  );

  whenVideoReady(container, () => addScanOverlay(container, mobile));

  return () => {
    stopLoop();
    release();
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
