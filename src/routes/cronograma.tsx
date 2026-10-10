import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Minus, Plus, Zap } from "lucide-react";
import { toast } from "sonner";
import { useStore, setoresDoModelo, demanda, type SetorOp } from "@/lib/store";
import { DATAS_ESPECIAIS, iso, tipoById } from "@/lib/catalog";
import { PageTitle, MODELO_COR } from "@/components/app-shell";
import { CardOp } from "./index";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/cronograma")({
  validateSearch: (search: Record<string, unknown>) =>
    search["surpresa"] === true || search["surpresa"] === "true" ? { surpresa: true } : {},
  head: () => ({
    meta: [
      { title: "Mutirões · Cronograma de demonstração · Controle T.I." },
      {
        name: "description",
        content: "Calendário de mutirões de demonstração com kits de TI por localidade.",
      },
      { property: "og:title", content: "Mutirões · Cronograma · Controle T.I." },
      {
        property: "og:description",
        content: "Calendário de mutirões e kits de equipamentos de TI.",
      },
    ],
  }),
  component: Cronograma,
});

function Cronograma() {
  const { operacoes } = useStore();
  const { surpresa } = Route.useSearch();
  const navigate = useNavigate({ from: "/cronograma" });
  const [dia, setDia] = useState<string | null>(null);
  const [filtro, setFiltro] = useState("todos");

  const lista = operacoes
    .filter((o) => (filtro === "todos" ? true : o.status === filtro))
    .filter((o) => (dia ? o.dias.some((d) => d.data === dia) : true));
  const primeiroDiaSemana = new Date(2026, 9, 1).getDay(); // qui
  const porDia = (d: string) => operacoes.filter((o) => o.dias.some((x) => x.data === d));

  return (
    <>
      <PageTitle
        title="Mutirões"
        sub="Cronograma de demonstração (dados fictícios) · dias seguidos na mesma cidade viram um único mutirão (o kit fica lá)."
      >
        <Button
          size="lg"
          className="h-12 gap-2 bg-danger text-base font-bold text-danger-foreground hover:bg-danger/90"
          onClick={() => navigate({ search: { surpresa: true } })}
        >
          <Zap className="h-5 w-5" /> Mutirão surpresa
        </Button>
      </PageTitle>

      <div className="mb-6 rounded-2xl border bg-card p-4">
        <div className="grid grid-cols-7 gap-1 text-center text-xs font-bold uppercase text-muted-foreground">
          {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map((d) => (
            <div key={d}>{d}</div>
          ))}
        </div>
        <div className="mt-1 grid grid-cols-7 gap-1">
          {Array.from({ length: primeiroDiaSemana }).map((_, i) => (
            <div key={i} />
          ))}
          {Array.from({ length: 31 }).map((_, i) => {
            const d = iso(i + 1);
            const ops = porDia(d);
            const esp = DATAS_ESPECIAIS[d];
            return (
              <button
                key={d}
                onClick={() => setDia(dia === d ? null : d)}
                className={cn(
                  "min-h-16 rounded-lg border p-1 text-left transition",
                  dia === d ? "border-primary bg-primary/10 ring-2 ring-primary" : "hover:bg-muted",
                  esp && "bg-accent/10",
                )}
              >
                <div className="flex items-center justify-between">
                  <span className="font-display font-bold">{i + 1}</span>
                  {ops.length > 0 && (
                    <span className="rounded-full bg-ink px-1.5 text-[10px] font-bold text-ink-foreground">
                      {ops.length}
                    </span>
                  )}
                </div>
                <div className="mt-1 flex flex-wrap gap-0.5">
                  {ops.map((o) => (
                    <span
                      key={o.id}
                      className={cn(
                        "h-1.5 w-3 rounded-full",
                        o.surpresa
                          ? "bg-danger"
                          : o.modeloId === "oftalmo"
                            ? "bg-info"
                            : o.modeloId === "triagem"
                              ? "bg-accent"
                              : "bg-primary",
                      )}
                    />
                  ))}
                </div>
                {esp && (
                  <p className="mt-0.5 hidden text-[9px] font-bold leading-tight text-accent sm:block">
                    {esp}
                  </p>
                )}
              </button>
            );
          })}
        </div>
        <div className="mt-3 flex flex-wrap gap-3 text-xs font-semibold">
          <span className="flex items-center gap-1">
            <i className="h-2 w-4 rounded-full bg-primary" /> Cirurgias
          </span>
          <span className="flex items-center gap-1">
            <i className="h-2 w-4 rounded-full bg-info" /> Oftalmo
          </span>
          <span className="flex items-center gap-1">
            <i className="h-2 w-4 rounded-full bg-accent" /> Triagem/Exames
          </span>
          <span className="flex items-center gap-1">
            <i className="h-2 w-4 rounded-full bg-danger" /> Surpresa
          </span>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {(
          [
            ["todos", "Todos"],
            ["planejada", "A separar"],
            ["separando", "Separando"],
            ["campo", "Em campo"],
            ["retornada", "Retornou"],
          ] as const
        ).map(([v, l]) => (
          <button
            key={v}
            onClick={() => setFiltro(v)}
            className={cn(
              "rounded-full border px-4 py-1.5 text-sm font-semibold",
              filtro === v && "bg-ink text-ink-foreground",
            )}
          >
            {l}
          </button>
        ))}
        {dia && (
          <button
            onClick={() => setDia(null)}
            className="rounded-full bg-primary px-4 py-1.5 text-sm font-semibold text-primary-foreground"
          >
            Dia {dia.slice(8)} ✕
          </button>
        )}
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {lista.map((o) => (
          <CardOp key={o.id} id={o.id} />
        ))}
      </div>

      <SurpresaDialog aberto={!!surpresa} fechar={() => navigate({ search: {} })} />
    </>
  );
}

function SurpresaDialog({ aberto, fechar }: { aberto: boolean; fechar: () => void }) {
  const { modelos, addOperacao } = useStore();
  const navigate = useNavigate();
  const amanha = new Date(Date.now() + 864e5).toISOString().slice(0, 10);
  const [local, setLocal] = useState("");
  const [inicio, setInicio] = useState(amanha);
  const [dias, setDias] = useState(1);
  const [servicos, setServicos] = useState("");
  const [modeloId, setModeloId] = useState("cirurgia");
  const [setores, setSetores] = useState<SetorOp[]>(() => {
    const modeloInicial = modelos.find((modelo) => modelo.id === "cirurgia") ?? modelos[0];
    return modeloInicial ? setoresDoModelo(modeloInicial) : [];
  });

  const trocarModelo = (id: string) => {
    const modelo = modelos.find((item) => item.id === id);
    if (!modelo) {
      toast.error("Modelo de kit não encontrado.");
      return;
    }
    setModeloId(id);
    setSetores(setoresDoModelo(modelo));
  };
  const dem = useMemo(() => demanda({ setores } as never), [setores]);
  const totalPat = Object.entries(dem)
    .filter(([t]) => tipoById(t)?.controle === "patrimonio")
    .reduce((a, [, q]) => a + q, 0);

  const criar = () => {
    if (!local.trim()) {
      toast.error("Informe a cidade / local");
      return;
    }
    const lista = Array.from({ length: dias }).map((_, i) => {
      const d = new Date(inicio + "T12:00:00");
      d.setDate(d.getDate() + i);
      return { data: d.toISOString().slice(0, 10), servicos: servicos || "Mutirão surpresa" };
    });
    const id = addOperacao({ local: local.trim(), dias: lista, modeloId, setores, surpresa: true });
    toast.success("Mutirão surpresa criado! Lista de separação pronta.");
    fechar();
    navigate({ to: "/operacao/$id", params: { id }, search: { aba: "separar" } });
  };

  return (
    <Dialog open={aberto} onOpenChange={(v) => !v && fechar()}>
      <DialogContent className="max-h-[92vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-display text-2xl">
            <Zap className="text-danger" /> Mutirão de última hora
          </DialogTitle>
        </DialogHeader>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-sm font-semibold">
            Cidade / local
            <Input
              autoFocus
              value={local}
              onChange={(e) => setLocal(e.target.value)}
              placeholder="Ex.: Feira de Santana"
              className="mt-1 h-12 text-base"
            />
          </label>
          <label className="text-sm font-semibold">
            Serviços
            <Input
              value={servicos}
              onChange={(e) => setServicos(e.target.value)}
              placeholder="Ex.: Cirurgia MAMA / USG"
              className="mt-1 h-12 text-base"
            />
          </label>
          <label className="text-sm font-semibold">
            Começa em
            <Input
              type="date"
              value={inicio}
              onChange={(e) => setInicio(e.target.value)}
              className="mt-1 h-12 text-base"
            />
          </label>
          <label className="text-sm font-semibold">
            Quantos dias
            <Input
              type="number"
              min={1}
              value={dias}
              onChange={(e) => setDias(Math.max(1, +e.target.value))}
              className="mt-1 h-12 text-base"
            />
          </label>
        </div>
        <p className="mt-2 text-sm font-semibold">Tipo de projeto</p>
        <div className="grid grid-cols-3 gap-2">
          {modelos.map((m) => (
            <button
              key={m.id}
              onClick={() => trocarModelo(m.id)}
              className={cn(
                "rounded-xl border-2 p-3 text-sm font-bold",
                modeloId === m.id ? MODELO_COR[m.cor] : "bg-background",
              )}
            >
              {m.nome}
            </button>
          ))}
        </div>
        <p className="mt-2 text-sm font-semibold">
          Funcionários por setor{" "}
          <span className="font-normal text-muted-foreground">(a lista recalcula na hora)</span>
        </p>
        <div className="space-y-1.5">
          {setores.map((s, i) => (
            <div
              key={s.id}
              className="flex items-center justify-between rounded-lg bg-muted px-3 py-1.5"
            >
              <span className="text-sm font-semibold">{s.nome}</span>
              <Stepper
                value={s.equipe}
                onChange={(v) =>
                  setSetores(setores.map((x, j) => (j === i ? { ...x, equipe: v } : x)))
                }
              />
            </div>
          ))}
        </div>
        <div className="rounded-xl bg-warn p-3 text-warn-foreground">
          <p className="font-display text-lg font-black">
            Separar: {totalPat} equipamentos com patrimônio
          </p>
          <p className="text-sm">
            {Object.entries(dem)
              .filter(([t]) => tipoById(t)?.controle === "patrimonio")
              .map(([t, q]) => `${q}× ${tipoById(t)?.nome}`)
              .join(" · ")}
          </p>
        </div>
        <Button
          size="lg"
          className="h-14 bg-danger text-lg font-bold text-danger-foreground hover:bg-danger/90"
          onClick={criar}
        >
          Criar e ir para separação →
        </Button>
      </DialogContent>
    </Dialog>
  );
}

export function Stepper({
  value,
  onChange,
  min = 0,
}: {
  value: number;
  onChange: (v: number) => void;
  min?: number;
}) {
  return (
    <div className="flex items-center gap-1">
      <Button
        type="button"
        size="icon"
        variant="outline"
        className="h-9 w-9"
        onClick={() => onChange(Math.max(min, value - 1))}
      >
        <Minus className="h-4 w-4" />
      </Button>
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(Math.max(min, +e.target.value || 0))}
        className="h-9 w-14 rounded-md border bg-card text-center font-display text-lg font-bold"
      />
      <Button
        type="button"
        size="icon"
        variant="outline"
        className="h-9 w-9"
        onClick={() => onChange(value + 1)}
      >
        <Plus className="h-4 w-4" />
      </Button>
    </div>
  );
}
