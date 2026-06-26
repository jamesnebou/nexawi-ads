"use client";

import { useMemo, useState } from "react";
import QRCode from "qrcode";

type StaticType =
  | "link"
  | "wifi"
  | "whatsapp"
  | "email"
  | "telefone"
  | "sms"
  | "texto"
  | "pix";

export default function QRPage() {
  const [mode, setMode] = useState<"static" | "dynamic">("static");

  const [staticType, setStaticType] = useState<StaticType>("link");
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [qrPayload, setQrPayload] = useState("");

  const [link, setLink] = useState("https://www.nexawi.com.br");
  const [text, setText] = useState("");
  const [ssid, setSsid] = useState("WIFI CANDIDO SALES - NexaWi");
  const [wifiSecurity, setWifiSecurity] = useState<"nopass" | "WPA">("nopass");
  const [wifiPassword, setWifiPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");
  const [emailSubject, setEmailSubject] = useState("");
  const [pixPayload, setPixPayload] = useState("");

  const [adminKey, setAdminKey] = useState("");
  const [dynamicName, setDynamicName] = useState("");
  const [dynamicSlug, setDynamicSlug] = useState("");
  const [dynamicTarget, setDynamicTarget] = useState("");
  const [dynamicType, setDynamicType] = useState("link");
  const [dynamicResult, setDynamicResult] = useState("");

  const payload = useMemo(() => {
    if (staticType === "link") return link;

    if (staticType === "texto") return text;

    if (staticType === "wifi") {
      if (wifiSecurity === "nopass") {
        return `WIFI:T:nopass;S:${ssid};;`;
      }

      return `WIFI:T:WPA;S:${ssid};P:${wifiPassword};;`;
    }

    if (staticType === "whatsapp") {
      const cleanPhone = phone.replace(/\D/g, "");
      const encodedMessage = encodeURIComponent(message);
      return `https://wa.me/${cleanPhone}${
        encodedMessage ? `?text=${encodedMessage}` : ""
      }`;
    }

    if (staticType === "email") {
      return `mailto:${email}?subject=${encodeURIComponent(
        emailSubject
      )}&body=${encodeURIComponent(message)}`;
    }

    if (staticType === "telefone") {
      return `tel:${phone.replace(/\D/g, "")}`;
    }

    if (staticType === "sms") {
      return `sms:${phone.replace(/\D/g, "")}?body=${encodeURIComponent(
        message
      )}`;
    }

    if (staticType === "pix") {
      return pixPayload;
    }

    return "";
  }, [
    staticType,
    link,
    text,
    ssid,
    wifiSecurity,
    wifiPassword,
    phone,
    message,
    email,
    emailSubject,
    pixPayload,
  ]);

  async function generateStaticQR() {
    if (!payload) return;

    const dataUrl = await QRCode.toDataURL(payload, {
      errorCorrectionLevel: "H",
      margin: 2,
      width: 900,
    });

    setQrPayload(payload);
    setQrDataUrl(dataUrl);
  }

  function downloadPNG() {
    if (!qrDataUrl) return;

    const a = document.createElement("a");
    a.href = qrDataUrl;
    a.download = "nexawi-qrcode.png";
    a.click();
  }

  async function createDynamicQR() {
    setDynamicResult("");
    setQrDataUrl("");
    setQrPayload("");

    const response = await fetch("/api/qrcodes", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-admin-key": adminKey,
      },
      body: JSON.stringify({
        name: dynamicName,
        slug: dynamicSlug,
        type: dynamicType,
        target_url: dynamicTarget,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      alert(data.error || "Erro ao criar QR dinâmico.");
      return;
    }

    const dynamicUrl = data.dynamic_url;

    const dataUrl = await QRCode.toDataURL(dynamicUrl, {
      errorCorrectionLevel: "H",
      margin: 2,
      width: 900,
    });

    setDynamicResult(dynamicUrl);
    setQrPayload(dynamicUrl);
    setQrDataUrl(dataUrl);
  }

  return (
    <main className="min-h-screen bg-black px-6 py-10 text-white">
      <div className="mx-auto max-w-5xl">
        <div className="mb-8">
          <p className="text-sm uppercase tracking-[0.3em] text-green-400">
            NexaWi QR Manager
          </p>
          <h1 className="mt-3 text-4xl font-bold">
            Gerador de QR Code
          </h1>
          <p className="mt-3 max-w-2xl text-zinc-400">
            Crie QR Codes estáticos ou dinâmicos com controle de destino e
            acompanhamento de acessos.
          </p>
        </div>

        <div className="mb-8 flex gap-3">
          <button
            onClick={() => setMode("static")}
            className={`rounded-xl px-5 py-3 font-semibold ${
              mode === "static"
                ? "bg-green-400 text-black"
                : "bg-zinc-900 text-white"
            }`}
          >
            QR Estático
          </button>

          <button
            onClick={() => setMode("dynamic")}
            className={`rounded-xl px-5 py-3 font-semibold ${
              mode === "dynamic"
                ? "bg-green-400 text-black"
                : "bg-zinc-900 text-white"
            }`}
          >
            QR Dinâmico
          </button>
        </div>

        <div className="grid gap-8 md:grid-cols-[1fr_380px]">
          <section className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
            {mode === "static" ? (
              <div className="space-y-5">
                <h2 className="text-2xl font-bold">QR Code Estático</h2>

                <label className="block">
                  <span className="mb-2 block text-sm text-zinc-400">
                    Tipo
                  </span>
                  <select
                    value={staticType}
                    onChange={(e) =>
                      setStaticType(e.target.value as StaticType)
                    }
                    className="w-full rounded-xl border border-zinc-700 bg-black p-3"
                  >
                    <option value="link">Link/Site</option>
                    <option value="wifi">Wi-Fi</option>
                    <option value="whatsapp">WhatsApp</option>
                    <option value="email">E-mail</option>
                    <option value="telefone">Telefone</option>
                    <option value="sms">SMS</option>
                    <option value="texto">Texto</option>
                    <option value="pix">Pix Copia e Cola</option>
                  </select>
                </label>

                {staticType === "link" && (
                  <Input label="Link" value={link} onChange={setLink} />
                )}

                {staticType === "texto" && (
                  <Textarea label="Texto" value={text} onChange={setText} />
                )}

                {staticType === "wifi" && (
                  <>
                    <Input
                      label="Nome da rede Wi-Fi"
                      value={ssid}
                      onChange={setSsid}
                    />

                    <label className="block">
                      <span className="mb-2 block text-sm text-zinc-400">
                        Segurança
                      </span>
                      <select
                        value={wifiSecurity}
                        onChange={(e) =>
                          setWifiSecurity(e.target.value as "nopass" | "WPA")
                        }
                        className="w-full rounded-xl border border-zinc-700 bg-black p-3"
                      >
                        <option value="nopass">Aberta / Sem senha</option>
                        <option value="WPA">WPA/WPA2 com senha</option>
                      </select>
                    </label>

                    {wifiSecurity === "WPA" && (
                      <Input
                        label="Senha"
                        value={wifiPassword}
                        onChange={setWifiPassword}
                      />
                    )}
                  </>
                )}

                {(staticType === "whatsapp" ||
                  staticType === "telefone" ||
                  staticType === "sms") && (
                  <Input
                    label="Telefone com DDD e país"
                    value={phone}
                    onChange={setPhone}
                    placeholder="5577999999999"
                  />
                )}

                {(staticType === "whatsapp" || staticType === "sms") && (
                  <Textarea
                    label="Mensagem"
                    value={message}
                    onChange={setMessage}
                  />
                )}

                {staticType === "email" && (
                  <>
                    <Input label="E-mail" value={email} onChange={setEmail} />
                    <Input
                      label="Assunto"
                      value={emailSubject}
                      onChange={setEmailSubject}
                    />
                    <Textarea
                      label="Mensagem"
                      value={message}
                      onChange={setMessage}
                    />
                  </>
                )}

                {staticType === "pix" && (
                  <Textarea
                    label="Pix Copia e Cola"
                    value={pixPayload}
                    onChange={setPixPayload}
                  />
                )}

                <button
                  onClick={generateStaticQR}
                  className="w-full rounded-xl bg-green-400 px-5 py-4 font-bold text-black"
                >
                  Gerar QR Code
                </button>
              </div>
            ) : (
              <div className="space-y-5">
                <h2 className="text-2xl font-bold">QR Code Dinâmico</h2>

                <Input
                  label="Chave Admin"
                  value={adminKey}
                  onChange={setAdminKey}
                  placeholder="QR_ADMIN_KEY"
                />

                <Input
                  label="Nome do QR"
                  value={dynamicName}
                  onChange={setDynamicName}
                  placeholder="QR Rio Branco"
                />

                <Input
                  label="Slug"
                  value={dynamicSlug}
                  onChange={setDynamicSlug}
                  placeholder="rio-branco"
                />

                <label className="block">
                  <span className="mb-2 block text-sm text-zinc-400">
                    Tipo
                  </span>
                  <select
                    value={dynamicType}
                    onChange={(e) => setDynamicType(e.target.value)}
                    className="w-full rounded-xl border border-zinc-700 bg-black p-3"
                  >
                    <option value="link">Link</option>
                    <option value="whatsapp">WhatsApp</option>
                    <option value="instagram">Instagram</option>
                    <option value="maps">Google Maps</option>
                    <option value="cardapio">Cardápio</option>
                    <option value="campanha">Campanha</option>
                  </select>
                </label>

                <Input
                  label="Destino"
                  value={dynamicTarget}
                  onChange={setDynamicTarget}
                  placeholder="https://..."
                />

                <button
                  onClick={createDynamicQR}
                  className="w-full rounded-xl bg-green-400 px-5 py-4 font-bold text-black"
                >
                  Criar QR Dinâmico
                </button>

                {dynamicResult && (
                  <div className="rounded-xl border border-green-400/30 bg-green-400/10 p-4 text-sm text-green-300">
                    QR criado: {dynamicResult}
                  </div>
                )}
              </div>
            )}
          </section>

          <aside className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
            <h2 className="mb-4 text-xl font-bold">Resultado</h2>

            {qrDataUrl ? (
              <div className="space-y-5">
                <div className="rounded-2xl bg-white p-4">
                  <img src={qrDataUrl} alt="QR Code NexaWi" />
                </div>

                <button
                  onClick={downloadPNG}
                  className="w-full rounded-xl bg-white px-5 py-3 font-bold text-black"
                >
                  Baixar PNG
                </button>

                <div>
                  <p className="mb-2 text-sm text-zinc-400">
                    Conteúdo do QR:
                  </p>
                  <textarea
                    readOnly
                    value={qrPayload}
                    className="h-32 w-full rounded-xl border border-zinc-700 bg-black p-3 text-xs text-zinc-300"
                  />
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-zinc-700 p-8 text-center text-zinc-500">
                O QR Code aparecerá aqui.
              </div>
            )}
          </aside>
        </div>
      </div>
    </main>
  );
}

function Input({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm text-zinc-400">{label}</span>
      <input
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-zinc-700 bg-black p-3 outline-none focus:border-green-400"
      />
    </label>
  );
}

function Textarea({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm text-zinc-400">{label}</span>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-28 w-full rounded-xl border border-zinc-700 bg-black p-3 outline-none focus:border-green-400"
      />
    </label>
  );
}