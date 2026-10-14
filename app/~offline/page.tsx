import { WifiOff } from "lucide-react";

export const metadata = { title: "Sin conexión" };

export default function OfflinePage() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-[480px] flex-col items-center justify-center gap-3 px-6 text-center">
      <WifiOff className="size-10 text-accent" aria-hidden />
      <h1 className="text-2xl font-extrabold">Sin conexión</h1>
      <p className="text-muted">Molero HQ necesita internet para cargar tus datos. Vuelve a intentarlo cuando tengas cobertura.</p>
    </main>
  );
}
