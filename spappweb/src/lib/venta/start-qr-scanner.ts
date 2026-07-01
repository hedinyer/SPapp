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

  const detector = new window.BarcodeDetector!({ formats: ["qr_code"] });
  let alive = true;
  let busy = false;
  let raf = 0;

  const tick = () => {
    if (!alive) return;
    raf = requestAnimationFrame(tick);
    if (busy || locked() || video.readyState < video.HAVE_ENOUGH_DATA) return;
    busy = true;
    void detector
      .detect(video)
      .then((codes) => {
        const raw = codes[0]?.rawValue?.trim();
        if (raw && !locked()) onCode(raw);
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
  });

  await scanner.start(
    { facingMode: "environment" },
    {
      fps: 15,
      qrbox: (viewfinderWidth, viewfinderHeight) => {
        const edge = Math.floor(
          Math.min(viewfinderWidth, viewfinderHeight) * 0.75,
        );
        return { width: edge, height: edge };
      },
      aspectRatio: 1,
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
