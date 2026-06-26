"use client";

import { useState } from "react";

type QRItem = {
  id: string;
  name: string;
  slug: string;
  type: string;
  target_url: string;
  status: string;
  dynamic_url: string;
  total_scans: number;
  scans_today: number;
  scans_7d: number;
  scans_30d: number;
  last_scan_at: string | null;
};

export default function QRPainelPage() {
  const [adminKey, setAdminKey] = useState("");
  const [items, setItems] = useState<QRItem[]>([]);
  const [loading, setLoading] = useState(false);

  async function loadQRCodes() {
    setLoading(true);

    const response = await fetch("/api/qrcodes", {
      headers: {
        "x-admin-key": adminKey,
      },
    });

    const data = await response.json();
    setLoading(false);

    if (!response.ok) {
      alert(data.error || "Erro ao carregar QR Codes.");
      return;
    }

    setItems(data.items || []);
  }

  async function updateQRCode(id: string, body: Record<string, string>) {
    const response = await fetch(`/api/qrcodes/${id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "x-admin-key": adminKey,
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    if (!response.ok) {
      alert(data.error || "Erro ao atualizar QR Code.");
      return;
    }

    await loadQRCodes();
  }

  async function changeTarget(item: QRItem) {
    const newTarget = window.prompt("Novo destino:", item.target_url);

    if (!newTarget || newTarget === item.target_url) return;

    await updateQRCode(item.id, {
      target_url: newTarget,
    });
  }

  async function toggleStatus(item: QRItem) {
    const newStatus = item.status === "active" ? "inactive" : "active";

    await updateQRCode(item.id, {
      status: newStatus,
    });
  }

  function formatDate(value: string | null) {
    if (!value) return "Nenhum acesso ainda";

    return new Intl.DateTimeFormat("pt-BR", {
      dateStyle: "short",
      timeStyle: "short",
    }).format(new Date(value));
  }

  return (
    <main className="min-h-screen bg-black px-6 py-10 text-white">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8">
          <p className="text-sm uppercase tracking-[0.3em] text-green-400">
            NexaWi QR Manager
          </p>

          <h1 className="mt-3 text-4xl font-bold">
            Painel de QR Codes
          </h1>

          <p className="mt-3 max-w-2xl text-zinc-400">
            Acompanhe os acessos, edite destinos e controle os QR Codes
            dinâmicos da NexaWi.
          </p>
        </div>

        <section className="mb-8 rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
          <label className="block">
            <span className="mb-2 block text-sm text-zinc-400">
              Chave Admin
            </span>

            <input
              value={adminKey}
              onChange={(event) => setAdminKey(event.target.value)}
              placeholder="Digite sua QR_ADMIN_KEY"
              className="w-full rounded-xl border border-zinc-700 bg-black p-3 outline-none focus:border-green-400"
            />
          </label>

          <button
            onClick={loadQRCodes}
            disabled={loading}
            className="mt-4 rounded-xl bg-green-400 px-5 py-3 font-bold text-black disabled:opacity-60"
          >
            {loading ? "Carregando..." : "Carregar QR Codes"}
          </button>
        </section>

        <section className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950">
          {items.length === 0 ? (
            <div className="p-8 text-center text-zinc-500">
              Nenhum QR Code carregado ainda.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1100px] text-left text-sm">
                <thead className="bg-zinc-900 text-zinc-400">
                  <tr>
                    <th className="p-4">Nome</th>
                    <th className="p-4">Slug</th>
                    <th className="p-4">Status</th>
                    <th className="p-4">Hoje</th>
                    <th className="p-4">7 dias</th>
                    <th className="p-4">30 dias</th>
                    <th className="p-4">Total</th>
                    <th className="p-4">Último acesso</th>
                    <th className="p-4">Ações</th>
                  </tr>
                </thead>

                <tbody>
                  {items.map((item) => (
                    <tr
                      key={item.id}
                      className="border-t border-zinc-800 align-top"
                    >
                      <td className="p-4">
                        <div className="font-semibold text-white">
                          {item.name}
                        </div>

                        <div className="mt-1 text-xs text-zinc-500">
                          {item.type}
                        </div>

                        <div className="mt-2 max-w-[280px] truncate text-xs text-zinc-400">
                          {item.target_url}
                        </div>
                      </td>

                      <td className="p-4">
                        <div className="text-green-400">
                          /q/{item.slug}
                        </div>

                        <a
                          href={item.dynamic_url}
                          target="_blank"
                          className="mt-2 block text-xs text-zinc-500 underline"
                        >
                          abrir
                        </a>
                      </td>

                      <td className="p-4">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-bold ${
                            item.status === "active"
                              ? "bg-green-400/15 text-green-400"
                              : "bg-red-400/15 text-red-400"
                          }`}
                        >
                          {item.status === "active" ? "Ativo" : "Inativo"}
                        </span>
                      </td>

                      <td className="p-4 font-bold">
                        {item.scans_today}
                      </td>

                      <td className="p-4 font-bold">
                        {item.scans_7d}
                      </td>

                      <td className="p-4 font-bold">
                        {item.scans_30d}
                      </td>

                      <td className="p-4 font-bold">
                        {item.total_scans}
                      </td>

                      <td className="p-4 text-zinc-400">
                        {formatDate(item.last_scan_at)}
                      </td>

                      <td className="p-4">
                        <div className="flex flex-wrap gap-2">
                          <button
                            onClick={() => changeTarget(item)}
                            className="rounded-lg bg-white px-3 py-2 text-xs font-bold text-black"
                          >
                            Editar destino
                          </button>

                          <button
                            onClick={() => toggleStatus(item)}
                            className="rounded-lg bg-zinc-800 px-3 py-2 text-xs font-bold text-white"
                          >
                            {item.status === "active"
                              ? "Desativar"
                              : "Ativar"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}