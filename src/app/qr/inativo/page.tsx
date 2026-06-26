export default function QRInativoPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-black px-6 text-white">
      <div className="max-w-md text-center">
        <p className="text-sm uppercase tracking-[0.3em] text-green-400">
          NexaWi QR
        </p>
        <h1 className="mt-4 text-3xl font-bold">QR Code inativo</h1>
        <p className="mt-4 text-zinc-400">
          Este QR Code está indisponível no momento. Entre em contato com o
          responsável pela campanha.
        </p>
      </div>
    </main>
  );
}