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

async function startNative(
  container: HTMLElement,
  onCode: (code: string) => void,
  locked: () => boolean,
): Promise<QrScannerStop> {
  const video = document.createElement("video");
  video.playsInline = true;
  video.muted = true;
  video.autoplay = true;
  Object.assign(video.style, {
    width: "100%",
    height: "100%",
    objectFit: "cover",
    display: "block",
  });
  container.replaceChildren(video);

  const stream = await navigator.mediaDevices.getUserMedia({
    video: {
      facingMode: { ideal: "environment" },
      width: { ideal: 1920 },
      height: { ideal: 1080 },
      // @ts-expect-error focusMode no está en todos los typings
      focusMode: { ideal: "continuous" },
    },
    audio: false,
  });
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
    {
      facingMode: "environment",
      width: { ideal: 1920 },
      height: { ideal: 1080 },
    },
    {
      fps: 30,
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
  if (window.BarcodeDetector) {
    try {
      const formats = await window.BarcodeDetector.getSupportedFormats();
      if (formats.includes("qr_code")) {
        return startNative(container, onCode, locked);
      }
    } catch {
      /* fallback */
    }
  }
  return startHtml5(container, onCode, locked);
}
