import QrScanner from "qr-scanner";

export type QrScannerStop = () => void;

type ScanEngine = Awaited<ReturnType<typeof QrScanner.createQrEngine>>;

const LUMA_R = 77;
const LUMA_G = 150;
const LUMA_B = 29;

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

function clampByte(v: number): number {
  return v < 0 ? 0 : v > 255 ? 255 : v;
}

function grayAt(data: Uint8ClampedArray, i: number): number {
  return (LUMA_R * data[i]! + LUMA_G * data[i + 1]! + LUMA_B * data[i + 2]!) >> 8;
}

function setGray(data: Uint8ClampedArray, i: number, g: number): void {
  data[i] = data[i + 1] = data[i + 2] = g;
}

function boxBlurGray(
  src: Uint8Array,
  width: number,
  height: number,
  radius: number,
): Uint8Array {
  const out = new Uint8Array(src.length);
  const tmp = new Uint8Array(src.length);
  const diam = radius * 2 + 1;

  for (let y = 0; y < height; y++) {
    let sum = 0;
    for (let x = -radius; x <= radius; x++) {
      sum += src[y * width + Math.min(width - 1, Math.max(0, x))]!;
    }
    for (let x = 0; x < width; x++) {
      tmp[y * width + x] = Math.round(sum / diam);
      const remove = x - radius;
      const add = x + radius + 1;
      sum -= src[y * width + Math.min(width - 1, Math.max(0, remove))]!;
      sum += src[y * width + Math.min(width - 1, Math.max(0, add))]!;
    }
  }

  for (let x = 0; x < width; x++) {
    let sum = 0;
    for (let y = -radius; y <= radius; y++) {
      sum += tmp[Math.min(height - 1, Math.max(0, y)) * width + x]!;
    }
    for (let y = 0; y < height; y++) {
      out[y * width + x] = Math.round(sum / diam);
      const remove = y - radius;
      const add = y + radius + 1;
      sum -= tmp[Math.min(height - 1, Math.max(0, remove)) * width + x]!;
      sum += tmp[Math.min(height - 1, Math.max(0, add)) * width + x]!;
    }
  }

  return out;
}

/** Rellena zonas quemadas por brillo del sticker con el entorno difuminado. */
function suppressStickerGlare(imageData: ImageData, threshold: number): void {
  const { data, width, height } = imageData;
  const lum = new Uint8Array(width * height);
  for (let i = 0, p = 0; i < data.length; i += 4, p++) {
    lum[p] = grayAt(data, i);
  }
  const blurred = boxBlurGray(lum, width, height, 4);

  for (let p = 0, i = 0; p < lum.length; p++, i += 4) {
    if (lum[p]! >= threshold) {
      const fill = blurred[p]!;
      setGray(data, i, fill);
      continue;
    }
    if (lum[p]! >= threshold - 25) {
      const fill = blurred[p]!;
      const mix = Math.round(lum[p]! * 0.35 + fill * 0.65);
      setGray(data, i, mix);
    }
  }
}

function applyGammaGrayscale(imageData: ImageData, gamma: number): void {
  const { data } = imageData;
  const inv = 1 / gamma;
  for (let i = 0; i < data.length; i += 4) {
    const g = grayAt(data, i);
    const out = clampByte(Math.round(255 * (g / 255) ** inv));
    setGray(data, i, out);
  }
}

function stretchContrast(imageData: ImageData, contrast: number, bias = 0): void {
  const { data } = imageData;
  for (let i = 0; i < data.length; i += 4) {
    const g = grayAt(data, i);
    const out = clampByte((g - 128) * contrast + 128 + bias);
    setGray(data, i, out);
  }
}

function boostLocalContrast(imageData: ImageData, amount: number): void {
  const { data, width, height } = imageData;
  const lum = new Uint8Array(width * height);
  for (let i = 0, p = 0; i < data.length; i += 4, p++) {
    lum[p] = grayAt(data, i);
  }
  const blurred = boxBlurGray(lum, width, height, 6);

  for (let p = 0, i = 0; p < lum.length; p++, i += 4) {
    const base = blurred[p]!;
    const detail = lum[p]! - base;
    setGray(data, i, clampByte(base + detail * amount));
  }
}

type GlareVariant = (imageData: ImageData) => void;

function glareVariants(mobile: boolean): GlareVariant[] {
  return [
    (d) => {
      suppressStickerGlare(d, 200);
      stretchContrast(d, 1.7);
    },
    (d) => {
      applyGammaGrayscale(d, 1.55);
      suppressStickerGlare(d, 190);
      stretchContrast(d, 1.9, -8);
    },
    (d) => {
      applyGammaGrayscale(d, 0.82);
      suppressStickerGlare(d, 215);
      stretchContrast(d, 1.5, 12);
    },
    (d) => {
      boostLocalContrast(d, 2.1);
      suppressStickerGlare(d, 205);
      stretchContrast(d, 1.6);
    },
    ...(mobile
      ? []
      : [
          ((d: ImageData) => {
            suppressStickerGlare(d, 175);
            boostLocalContrast(d, 2.4);
            stretchContrast(d, 2.2, -5);
          }) satisfies GlareVariant,
        ]),
  ];
}

function drawVideoFrame(
  video: HTMLVideoElement,
  canvas: HTMLCanvasElement,
  downScaledWidth: number,
): boolean {
  const vw = video.videoWidth;
  const vh = video.videoHeight;
  if (vw < 2 || vh < 2) return false;

  const w = Math.min(downScaledWidth, vw);
  const h = Math.round((w * vh) / vw);
  canvas.width = w;
  canvas.height = h;

  const ctx = canvas.getContext("2d", {
    alpha: false,
    willReadFrequently: true,
  });
  if (!ctx) return false;

  ctx.drawImage(video, 0, 0, vw, vh, 0, 0, w, h);
  return true;
}

async function acquireBestCameraStream(mobile: boolean): Promise<MediaStream> {
  const highResVideo = {
    facingMode: { ideal: "environment" },
    width: { ideal: mobile ? 1920 : 2560, min: 1280 },
    height: { ideal: mobile ? 1080 : 1440, min: 720 },
    focusMode: { ideal: "continuous" },
    exposureMode: { ideal: "continuous" },
    whiteBalanceMode: { ideal: "continuous" },
    exposureCompensation: { ideal: -0.7 },
  } as MediaTrackConstraints;

  const midResVideo = {
    facingMode: { ideal: "environment" },
    width: { ideal: 1280 },
    height: { ideal: 720 },
    focusMode: { ideal: "continuous" },
    exposureCompensation: { ideal: -0.5 },
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
    exposureCompensation?: number;
  };

  const advanced: AdvancedConstraint[] = [
    { focusMode: "continuous" },
    { exposureMode: "continuous" },
    { whiteBalanceMode: "continuous" },
    { exposureCompensation: -0.7 },
  ];

  try {
    await track.applyConstraints({ advanced } as MediaTrackConstraints);
  } catch {
    // Algunos navegadores no soportan estos modos.
  }
}

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

async function tryScan(
  source: HTMLVideoElement | HTMLCanvasElement,
  engine: ScanEngine,
  canvas: HTMLCanvasElement,
  scanRegion: QrScanner.ScanRegion | null,
): Promise<string | null> {
  try {
    const result = await QrScanner.scanImage(source, {
      scanRegion,
      qrEngine: engine,
      canvas,
      alsoTryWithoutScanRegion: true,
      returnDetailedScanResult: true,
    });
    const raw = result.data?.trim();
    return raw || null;
  } catch {
    return null;
  }
}

async function decodeGlareVariants(
  video: HTMLVideoElement,
  workCanvas: HTMLCanvasElement,
  engine: ScanEngine,
  scanCanvas: HTMLCanvasElement,
  mobile: boolean,
  primaryCap: number,
): Promise<string | null> {
  if (!drawVideoFrame(video, workCanvas, primaryCap)) return null;

  const ctx = workCanvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;

  const base = ctx.getImageData(0, 0, workCanvas.width, workCanvas.height);
  const scratch = new Uint8ClampedArray(base.data);

  for (const variant of glareVariants(mobile)) {
    base.data.set(scratch);
    variant(base);
    ctx.putImageData(base, 0, 0);
    const raw = await tryScan(workCanvas, engine, scanCanvas, null);
    if (raw) return raw;
  }

  return null;
}

async function decodeFrameRobust(
  video: HTMLVideoElement,
  engine: ScanEngine,
  scanCanvas: HTMLCanvasElement,
  workCanvas: HTMLCanvasElement,
  mobile: boolean,
): Promise<string | null> {
  if (video.videoWidth < 2 || video.videoHeight < 2) return null;

  const scales = scanScaleCaps(mobile);

  for (const cap of scales) {
    const scanRegion = buildScanRegion(video, cap);
    const raw = await tryScan(video, engine, scanCanvas, scanRegion);
    if (raw) return raw;
  }

  return decodeGlareVariants(
    video,
    workCanvas,
    engine,
    scanCanvas,
    mobile,
    scales[0]!,
  );
}

function startRobustScanLoop(
  video: HTMLVideoElement,
  engine: ScanEngine,
  scanCanvas: HTMLCanvasElement,
  workCanvas: HTMLCanvasElement,
  mobile: boolean,
  locked: () => boolean,
  onCode: (code: string) => void,
): () => void {
  let active = true;
  let busy = false;
  let lastScanAt = 0;
  const minIntervalMs = mobile ? 70 : 50;

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

    void decodeFrameRobust(video, engine, scanCanvas, workCanvas, mobile)
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

  const { engine, canvas: scanCanvas, release } = await createTunedEngine(video);
  const workCanvas = document.createElement("canvas");
  const stopLoop = startRobustScanLoop(
    video,
    engine,
    scanCanvas,
    workCanvas,
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
