import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Archive, Printer, QrCode } from "lucide-react";
import { useStore, STATUS_EQUIP, type StatusEquip } from "@/lib/store";
import { TIPOS, tipoById } from "@/lib/catalog";
import { PageTitle, OrigemBadge } from "@/components/app-shell";
import { QrImage } from "@/components/qr";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/estoque")({
  head: () => ({
    meta: [
      { title: "Estoque de equipamentos · Controle T.I." },
      {
        name: "description",
        content:
          "Todos os equipamentos com status, origem (alugado/patrimonial), localização e etiquetas QR.",
      },
      { property: "og:title", content: "Estoque · Controle T.I." },
      { property: "og:description", content: "Estoque de equipamentos de TI com etiquetas QR." },
    ],
  }),
  component: Estoque,
});

function Estoque() {
  const { equipamentos, operacoes, estoqueQtd, updateEquip } = useStore();
  const [busca, setBusca] = useState("");
  const [status, setStatus] = useState<StatusEquip | "todos">("todos");
  const [origem, setOrigem] = useState<"todos" | "patrimonial" | "alugado">("todos");
  const [qrSel, setQrSel] = useState<string[] | null>(null);

  const lista = useMemo(() => {
    const b = busca.toLowerCase();
    return equipamentos.filter(
      (e) =>
        (status === "todos" || e.status === status) &&
        (origem === "todos" || e.origem === origem) &&
        (!b ||
          [e.patrimonio, e.modelo, e.serie, tipoById(e.tipoId)?.nome]
            .join(" ")
            .toLowerCase()
            .includes(b)),
    );
  }, [equipamentos, busca, status, origem]);

  const resumo = TIPOS.filter((t) => t.controle === "patrimonio")
    .map((t) => {
      const l = equipamentos.filter((e) => e.tipoId === t.id);
      return { t, total: l.length, disp: l.filter((e) => e.status === "disponivel").length };
    })
    .filter((r) => r.total);

  return (
    <>
      <PageTitle title="Estoque" sub={`${equipamentos.length} equipamentos com patrimônio`}>
        <Button
          variant="outline"
          className="gap-2"
          onClick={() => setQrSel(lista.map((e) => e.id))}
        >
          <Printer className="h-4 w-4" /> Etiquetas QR ({lista.length})
        </Button>
      </PageTitle>

      {resumo.length > 0 && (
        <div className="mb-5 flex gap-2 overflow-x-auto pb-2">
          {resumo.map((r) => (
            <div
              key={r.t.id}
              className={cn(
                "min-w-36 rounded-xl p-3",
                r.disp === 0
                  ? "bg-danger text-danger-foreground"
                  : r.disp < 3
                    ? "bg-warn text-warn-foreground"
                    : "bg-ok text-ok-foreground",
              )}
            >
              <p className="font-display text-2xl font-black">
                {r.disp}
                <span className="text-sm font-semibold opacity-80">/{r.total}</span>
              </p>
              <p className="text-xs font-bold">{r.t.nome}</p>
            </div>
          ))}
        </div>
      )}

      <div className="mb-4 flex flex-col gap-2 md:flex-row">
        <Input
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar patrimônio, modelo, série…"
          className="h-12 flex-1"
        />
        <div className="flex flex-wrap gap-1">
          {(["todos", "disponivel", "separado", "campo", "manutencao", "baixa"] as const).map(
            (s) => (
              <button
                key={s}
                onClick={() => setStatus(s)}
                className={cn(
                  "rounded-full px-3 py-2 text-xs font-bold",
                  s === "todos"
                    ? status === s
                      ? "bg-ink text-ink-foreground"
                      : "bg-muted"
                    : status === s
                      ? STATUS_EQUIP[s].cls
                      : "bg-muted",
                )}
              >
                {s === "todos" ? "Todos" : STATUS_EQUIP[s].label}
              </button>
            ),
          )}
          {(["patrimonial", "alugado"] as const).map((o) => (
            <button
              key={o}
              onClick={() => setOrigem(origem === o ? "todos" : o)}
              className={cn(
                "rounded-full px-3 py-2 text-xs font-bold",
                origem === o
                  ? o === "alugado"
                    ? "bg-rent text-rent-foreground"
                    : "bg-own text-own-foreground"
                  : "bg-muted",
              )}
            >
              {o === "alugado" ? "Alugados" : "Patrimoniais"}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto rounded-2xl border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted text-left text-xs uppercase">
            <tr>
              <th className="p-3">Patrimônio</th>
              <th>Tipo</th>
              <th>Modelo</th>
              <th>Origem</th>
              <th>Status</th>
              <th>Onde está</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {lista.map((e) => (
              <tr key={e.id} className="border-t">
                <td className="p-3 font-mono font-bold">{e.patrimonio}</td>
                <td>{tipoById(e.tipoId)?.nome}</td>
                <td>
                  {e.modelo}
                  {e.obs && <p className="text-xs text-danger">{e.obs}</p>}
                </td>
                <td>
                  <OrigemBadge origem={e.origem} />
                  {e.fornecedor && <p className="text-xs text-muted-foreground">{e.fornecedor}</p>}
                </td>
                <td>
                  <select
                    value={e.status}
                    disabled={e.status === "campo" || e.status === "separado"}
                    onChange={(ev) => updateEquip(e.id, { status: ev.target.value as StatusEquip })}
                    className={cn(
                      "rounded-md px-2 py-1 text-xs font-bold",
                      STATUS_EQUIP[e.status].cls,
                    )}
                  >
                    {Object.entries(STATUS_EQUIP).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v.label}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="text-xs">
                  {operacoes.find((o) => o.id === e.operacaoId)?.local ?? "CD"}
                </td>
                <td className="whitespace-nowrap pr-2">
                  <button className="p-1" title="QR" onClick={() => setQrSel([e.id])}>
                    <QrCode className="h-4 w-4" />
                  </button>
                  {e.status === "disponivel" && (
                    <button
                      className="p-1"
                      title="Dar baixa mantendo o histórico"
                      aria-label={`Dar baixa em ${e.patrimonio}`}
                      onClick={() =>
                        confirm(
                          `Dar baixa em ${e.patrimonio}? O registro e o histórico serão preservados.`,
                        ) && updateEquip(e.id, { status: "baixa" })
                      }
                    >
                      <Archive className="h-4 w-4 text-danger" />
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {lista.length === 0 && (
              <tr>
                <td colSpan={7} className="p-8 text-center text-muted-foreground">
                  Nenhum equipamento. Cadastre em “Entrada”.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <h2 className="mb-3 mt-8 text-xl font-bold">Itens por quantidade no CD</h2>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
        {TIPOS.filter((t) => t.controle === "quantidade").map((t) => (
          <div
            key={t.id}
            className={cn(
              "rounded-xl border p-3",
              (estoqueQtd[t.id] || 0) === 0 ? "border-danger bg-danger/10" : "bg-card",
            )}
          >
            <p className="font-display text-2xl font-black">{estoqueQtd[t.id] || 0}</p>
            <p className="text-xs font-semibold">{t.nome}</p>
          </div>
        ))}
      </div>

      <Dialog open={!!qrSel} onOpenChange={(v) => !v && setQrSel(null)}>
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Etiquetas QR — cole no equipamento</DialogTitle>
          </DialogHeader>
          <div id="etiquetas" className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {equipamentos
              .filter((e) => qrSel?.includes(e.id))
              .map((e) => (
                <div
                  key={e.id}
                  className="flex flex-col items-center rounded-lg border p-2 text-center"
                >
                  <QrImage value={e.patrimonio} size={110} />
                  <p className="font-mono text-sm font-bold">{e.patrimonio}</p>
                  <p className="text-[10px]">
                    {tipoById(e.tipoId)?.nome} · {e.origem === "alugado" ? "ALUGADO" : "PATRIM."}
                  </p>
                </div>
              ))}
          </div>
          <Button onClick={() => imprimir()} className="gap-2">
            <Printer className="h-4 w-4" /> Imprimir etiquetas
          </Button>
        </DialogContent>
      </Dialog>
    </>
  );
}

function imprimir() {
  const el = document.getElementById("etiquetas");
  if (!el) return;
  const w = window.open("", "_blank");
  if (!w) return;
  w.document.write(
    `<html><head><title>Etiquetas QR</title><style>body{font-family:sans-serif}#g{display:grid;grid-template-columns:repeat(4,1fr);gap:8px}#g>div{border:1px dashed #999;padding:6px;text-align:center;font-size:11px}p{margin:2px}</style></head><body><div id="g">${el.innerHTML}</div><script>setTimeout(()=>print(),300)</script></body></html>`,
  );
  w.document.close();
}
