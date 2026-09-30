import Link from 'next/link'

export const metadata = {
  title: 'Link indisponível | NexaWi',
  robots: { index: false, follow: false },
}

export default function ShortLinkInactivePage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#050706] px-5 text-white">
      <div className="w-full max-w-lg rounded-[2rem] border border-white/10 bg-white/[0.03] p-8 text-center shadow-2xl sm:p-12">
        <p className="text-xs font-bold uppercase tracking-[0.25em] text-[#8cf45e]">NexaWi</p>
        <h1 className="mt-5 text-3xl font-extrabold tracking-tight sm:text-4xl">Este link não está disponível.</h1>
        <p className="mt-4 text-sm leading-7 text-neutral-400">
          Confira o endereço com quem compartilhou o link. Ele pode ter sido desativado ou digitado incorretamente.
        </p>
        <Link href="/" className="mt-8 inline-flex rounded-xl bg-[#69e52f] px-5 py-3 text-sm font-bold text-black transition hover:bg-[#8cf45e]">
          Ir para a NexaWi
        </Link>
      </div>
    </main>
  )
}
