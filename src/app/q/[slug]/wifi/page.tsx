import { redirect } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import {WifiQrBox} from "@/components/WifiQrBox";

export default async function DynamicWifiPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const { data: qrCode } = await supabaseAdmin
    .from("qr_codes")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();

  if (!qrCode || qrCode.status !== "active" || qrCode.type !== "wifi") {
    redirect("/qr/inativo");
  }

  const isOpen = qrCode.wifi_security === "nopass";

  return (
    <main className="flex min-h-screen items-center justify-center bg-black px-6 py-10 text-white">
      <section className="w-full max-w-lg rounded-3xl border border-zinc-800 bg-zinc-950 p-6 text-center">
        <p className="text-sm uppercase tracking-[0.3em] text-green-400">
          NexaWi Wi-Fi
        </p>

        <h1 className="mt-4 text-3xl font-bold">
          Conecte-se ao Wi-Fi
        </h1>

        <p className="mt-3 text-zinc-400">
          Use os dados abaixo para se conectar à rede.
        </p>

        <div className="mt-8 rounded-2xl bg-zinc-900 p-5 text-left">
          <p className="text-sm text-zinc-500">Nome da rede</p>
          <p className="mt-1 break-words text-xl font-bold text-white">
            {qrCode.wifi_ssid}
          </p>

          <p className="mt-5 text-sm text-zinc-500">Senha</p>
          <p className="mt-1 text-xl font-bold text-white">
            {isOpen ? "Rede aberta / sem senha" : qrCode.wifi_password}
          </p>
        </div>

        <div className="mt-6 rounded-2xl bg-white p-4">
          <WifiQrBox
            ssid={qrCode.wifi_ssid}
            security={qrCode.wifi_security || "nopass"}
            password={qrCode.wifi_password || ""}
            hidden={Boolean(qrCode.wifi_hidden)}
          />
        </div>

        <p className="mt-5 text-sm text-zinc-500">
          Se estiver no celular, você também pode abrir a lista de Wi-Fi e
          selecionar a rede acima.
        </p>
      </section>
    </main>
  );
}