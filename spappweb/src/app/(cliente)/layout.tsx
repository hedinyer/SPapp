import type { Metadata } from "next";
import Image from "next/image";

export const metadata: Metadata = {
  title: "Hoja de vida",
};

export default function ClienteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-white text-black">
      <main className="mx-auto max-w-lg px-4 py-6 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
        <header className="safe-area-top mb-6 flex justify-center">
          <Image
            src="/logos_login.jpeg"
            alt="Speed Promotora"
            width={320}
            height={120}
            className="h-auto w-full max-w-[280px] object-contain"
            priority
          />
        </header>
        {children}
      </main>
    </div>
  );
}
