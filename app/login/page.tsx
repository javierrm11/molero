import { LoginForm } from "./login-form";

export const metadata = { title: "Entrar" };

export default function LoginPage() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-[440px] flex-col justify-center gap-8 px-5 py-10">
      <div className="flex flex-col gap-3 px-1">
        <span aria-hidden className="flex size-14 items-center justify-center rounded-[18px] bg-accent text-2xl font-extrabold text-white">
          M
        </span>
        <h1 className="text-[32px] font-extrabold leading-tight tracking-[-0.8px]">Molero HQ</h1>
        <p className="text-[15px] text-muted">Tu agenda, tu contenido y tus ventas en un sitio.</p>
      </div>
      <LoginForm />
    </main>
  );
}
