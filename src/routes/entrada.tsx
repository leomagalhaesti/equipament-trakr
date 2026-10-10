import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { useStore, type Origem } from "@/lib/store";
import { TIPOS, tipoById } from "@/lib/catalog";
import { PageTitle, OrigemBadge } from "@/components/app-shell";
import { QrImage, QrScanner } from "@/components/qr";
import { Stepper } from "./cronograma";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/entrada")({
  head: () => ({
    meta: [
      { title: "Entrada de equipamentos · Controle T.I." },
      {
        name: "description",
        content:
          "Cadastro rápido de equipamentos: patrimônio, modelo, alugado ou patrimonial e QR code.",
      },
      { property: "og:title", content: "Entrada de equipamentos · Controle T.I." },
      {
        property: "og:description",
        content: "Cadastro rápido de equipamentos de TI no Centro de Distribuição.",
      },
    ],
  }),
  component: Entrada,
});

function Entrada() {
  const { addEquip, equipamentos, estoqueQtd, ajustarQtd } = useStore();
  const [modo, setModo] = useState<"patrimonio" | "quantidade">("patrimonio");
  const [tipoId, setTipoId] = useState("notebook");
  const [patrimonio, setPatrimonio] = useState("");
  const [modelo, setModelo] = useState("");
  const [serie, setSerie] = useState("");
  const [origem, setOrigem] = useState<Origem>("patrimonial");
  const [fornecedor, setFornecedor] = useState("");
  const [qtdTipo, setQtdTipo] = useState("mouse");
  const [qtd, setQtd] = useState(1);
  const [motivoRetirada, setMotivoRetirada] = useState("");
  const patRef = useRef<HTMLInputElement>(null);
  const sessao = equipamentos.slice(0, 12);

  const salvar = (e?: FormEvent) => {
    e?.preventDefault();
    const r = addEquip({
      tipoId,
      patrimonio,
      modelo,
      serie,
      origem,
      fornecedor: origem === "alugado" ? fornecedor : "",
      obs: "",
    });
    if (!r.ok) {
      toast.error(r.msg);
      return;
    }
    toast.success(`${tipoById(tipoId)?.nome} ${patrimonio.toUpperCase()} cadastrado`);
    setPatrimonio("");
    setSerie("");
    patRef.current?.focus(); // mantém tipo, modelo e origem para digitar o próximo rápido
  };

  return (
    <>
      <PageTitle
        title="Entrada no estoque"
        sub="Dica: tipo, modelo e origem ficam guardados — só troque o patrimônio e aperte Enter para o próximo."
      />
      <div className="mb-4 grid grid-cols-2 gap-2">
        <button
          onClick={() => setModo("patrimonio")}
          className={cn(
            "rounded-xl border-2 p-4 text-left font-bold",
            modo === "patrimonio" ? "border-primary bg-primary text-primary-foreground" : "bg-card",
          )}
        >
          Com patrimônio
          <span className="block text-sm font-normal opacity-80">
            Notebook, impressora, TV, tablet…
          </span>
        </button>
        <button
          onClick={() => setModo("quantidade")}
          className={cn(
            "rounded-xl border-2 p-4 text-left font-bold",
            modo === "quantidade" ? "border-accent bg-accent text-accent-foreground" : "bg-card",
          )}
        >
          Por quantidade
          <span className="block text-sm font-normal opacity-80">
            Mouse, extensão, cabos, insumos…
          </span>
        </button>
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        {modo === "patrimonio" ? (
          <form
            onSubmit={salvar}
            className="space-y-4 rounded-2xl border bg-card p-5 lg:col-span-3"
          >
            <div>
              <p className="mb-2 text-sm font-bold">1. Tipo</p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {TIPOS.filter((t) => t.controle === "patrimonio").map((t) => (
                  <button
                    type="button"
                    key={t.id}
                    onClick={() => setTipoId(t.id)}
                    className={cn(
                      "rounded-lg border-2 px-3 py-2 text-left text-sm font-semibold",
                      tipoId === t.id ? "border-ink bg-ink text-ink-foreground" : "bg-background",
                    )}
                  >
                    {t.nome}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="mb-2 text-sm font-bold">2. Origem</p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setOrigem("patrimonial")}
                  className={cn(
                    "rounded-xl border-2 p-3 font-bold",
                    origem === "patrimonial"
                      ? "border-own bg-own text-own-foreground"
                      : "bg-background",
                  )}
                >
                  🏢 Patrimonial (da empresa)
                </button>
                <button
                  type="button"
                  onClick={() => setOrigem("alugado")}
                  className={cn(
                    "rounded-xl border-2 p-3 font-bold",
                    origem === "alugado"
                      ? "border-rent bg-rent text-rent-foreground"
                      : "bg-background",
                  )}
                >
                  🔑 Alugado
                </button>
              </div>
              {origem === "alugado" && (
                <Input
                  value={fornecedor}
                  onChange={(e) => setFornecedor(e.target.value)}
                  placeholder="Locadora / fornecedor"
                  className="mt-2 h-12"
                />
              )}
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-sm font-bold">
                3. Modelo
                <Input
                  value={modelo}
                  onChange={(e) => setModelo(e.target.value)}
                  placeholder="Ex.: Dell Latitude 3420"
                  className="mt-1 h-12 text-base"
                />
              </label>
              <label className="text-sm font-bold">
                Nº de série (opcional)
                <Input
                  value={serie}
                  onChange={(e) => setSerie(e.target.value)}
                  className="mt-1 h-12 text-base"
                />
              </label>
            </div>
            <label className="block text-sm font-bold">
              4. Patrimônio / etiqueta
              <div className="mt-1 flex gap-2">
                <Input
                  ref={patRef}
                  autoFocus
                  value={patrimonio}
                  onChange={(e) => setPatrimonio(e.target.value)}
                  placeholder="Ex.: MS-0001"
                  className="h-14 flex-1 font-mono text-xl uppercase"
                />
                <QrScanner label="Ler" onRead={(t) => setPatrimonio(t)} />
              </div>
            </label>
            <Button type="submit" size="lg" className="h-14 w-full text-lg font-bold">
              Cadastrar (Enter)
            </Button>
          </form>
        ) : (
          <div className="space-y-4 rounded-2xl border bg-card p-5 lg:col-span-3">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {TIPOS.filter((t) => t.controle === "quantidade").map((t) => (
                <button
                  key={t.id}
                  onClick={() => setQtdTipo(t.id)}
                  className={cn(
                    "rounded-lg border-2 px-3 py-2 text-left text-sm font-semibold",
                    qtdTipo === t.id ? "border-ink bg-ink text-ink-foreground" : "bg-background",
                  )}
                >
                  {t.nome}
                  <span className="block text-xs opacity-70">Estoque: {estoqueQtd[t.id] || 0}</span>
                </button>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Stepper value={qtd} min={1} onChange={setQtd} />
              <Button
                size="lg"
                className="h-12 bg-ok font-bold text-ok-foreground"
                onClick={() => {
                  const result = ajustarQtd(qtdTipo, qtd);
                  if (!result.ok) {
                    toast.error(result.msg);
                    return;
                  }
                  toast.success(`+${qtd} ${tipoById(qtdTipo)?.nome}`);
                }}
              >
                Adicionar ao estoque
              </Button>
            </div>
            <label className="block text-sm font-semibold">
              Motivo da retirada
              <Input
                value={motivoRetirada}
                onChange={(e) => setMotivoRetirada(e.target.value)}
                placeholder="Ex.: avaria, consumo ou correção de contagem"
                className="mt-1 h-11"
              />
            </label>
            <Button
              size="lg"
              variant="outline"
              className="h-12"
              disabled={!motivoRetirada.trim()}
              onClick={() => {
                const result = ajustarQtd(qtdTipo, -qtd, motivoRetirada);
                if (!result.ok) {
                  toast.error(result.msg);
                  return;
                }
                toast.success(`-${qtd} ${tipoById(qtdTipo)?.nome}`);
                setMotivoRetirada("");
              }}
            >
              Retirar do estoque
            </Button>
          </div>
        )}

        <aside className="rounded-2xl border bg-card p-5 lg:col-span-2">
          <h2 className="mb-3 text-lg font-bold">Últimos cadastrados</h2>
          {sessao.length === 0 && <p className="text-muted-foreground">Nenhum ainda.</p>}
          {sessao.map((e) => (
            <div key={e.id} className="mb-2 flex items-center gap-3 rounded-xl bg-muted p-2">
              <QrImage value={e.patrimonio} size={52} />
              <div className="min-w-0 flex-1">
                <p className="font-mono font-bold">{e.patrimonio}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {tipoById(e.tipoId)?.nome} · {e.modelo}
                </p>
              </div>
              <OrigemBadge origem={e.origem} />
            </div>
          ))}
        </aside>
      </div>
    </>
  );
}
