"use client";

import { Toaster as Sonner } from "sonner";

export function Toaster() {
  return (
    <Sonner
      position="bottom-center"
      richColors
      toastOptions={{
        classNames: {
          toast: "mb-[max(0.5rem,env(safe-area-inset-bottom))]",
        },
      }}
    />
  );
}
