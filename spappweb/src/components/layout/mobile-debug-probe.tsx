"use client";

import { useEffect } from "react";
import { mobileLog } from "@/lib/debug/mobile-log";

export function MobileDebugProbe() {
  useEffect(() => {
    const reportViewport = () => {
      mobileLog({
        location: "mobile-debug-probe.tsx:viewport",
        message: "viewport",
        hypothesisId: "A",
        data: {
          w: window.innerWidth,
          h: window.innerHeight,
          dpr: window.devicePixelRatio,
          touch: "ontouchstart" in window,
        },
      });
    };

    reportViewport();
    window.addEventListener("resize", reportViewport);

    function onPointer(e: PointerEvent) {
      const el = (e.target as HTMLElement | null)?.closest("[data-mobile-probe]");
      if (!el) return;
      mobileLog({
        location: "mobile-debug-probe.tsx:pointer",
        message: "probe tap",
        hypothesisId: "E",
        data: {
          probe: el.getAttribute("data-mobile-probe"),
          tag: el.tagName,
          pointerType: e.pointerType,
        },
      });
    }

    document.addEventListener("pointerup", onPointer, { capture: true });

    return () => {
      window.removeEventListener("resize", reportViewport);
      document.removeEventListener("pointerup", onPointer, { capture: true });
    };
  }, []);

  return null;
}
