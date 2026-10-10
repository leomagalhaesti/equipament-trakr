import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useRef, useState, type FormEvent } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Check,
  FileDown,
  Trash2,
  Truck,
  Undo2,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import {
  useStore,
  demanda,
  qtdItem,
  fmtData,
  STATUS_OP,
  setoresDoModelo,
  type Operacao,
  type TipoOcorrencia,
} from "@/lib/store";
import { TIPOS, tipoById } from "@/lib/catalog";
import { OrigemBadge, MODELO_COR } from "@/components/app-shell";
import { QrScanner } from "@/components/qr";
import { Stepper } from "./cronograma";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { pdfRomaneio } from "@/lib/pdf";
import { cn } from "@/lib/utils";

type Aba = "equipe" | "separar" | "retorno" | "fechamento";

export const Route = createFileRoute("/operacao/$id")({
  validateSearch: (search: Record<string, unknown>): { aba?: Aba } => {
    const aba = search["aba"];
    return typeof aba === "string" && ["equipe", "separar", "retorno", "fechamento"].includes(aba)
      ? { aba: aba as Aba }
      : {};
  },
  head: () => ({
    meta: [
      { title: "Mutirão · Separação e retorno · Controle T.I." },
      {
        name: "description",
        content: "Equipe por setor, lista de separação, conferência de saída e retorno do mutirão.",
      },
      { property: "og:title", content: "Mutirão · Controle T.I." },
      {
        property: "og:description",
        content: "Separação e conferência de equipamentos do mutirão.",
      },
    ],
  }),
  component: OperacaoPage,
});

function OperacaoPage() {
  const { id } = Route.useParams();
  const { aba: abaUrl } = Route.useSearch();
  const navigate = useNavigate({ from: "/operacao/$id" });
  const op = useStore((s) => s.operacoes.find((o) => o.id === id));
  const { modelos, updateOperacao, removeOperacao } = useStore();
  if (!op)
    return (
      <div className="py-20 text-center">
        Mutirão não encontrado.{" "}
        <Link to="/cronograma" className="text-primary underline">
          Voltar
        </Link>
      </div>
    );
  const primeiroDia = op.dias[0];
  if (!primeiroDia)
    return (
      <div className="py-20 text-center">
        Mutirão sem data.{" "}
        <Link to="/cronograma" className="text-primary underline">
          Voltar
        </Link>
      </div>
    );
  const ultimaData = op.dias[op.dias.length - 1]?.data ?? primeiroDia.data;

  const padrao: Aba =
    op.status === "retornada"
      ? "fechamento"
      : op.status === "campo"
        ? "retorno"
        : op.status === "separando"
          ? "separar"
          : "equipe";
  const aba = abaUrl ?? padrao;
  const m = modelos.find((x) => x.id === op.modeloId);

  const abas: { id: Aba; label: string; n: number }[] = [
    { id: "equipe", label: "Equipe e kit", n: 1 },
    { id: "separar", label: "Separação e saída", n: 2 },
    { id: "retorno", label: "Conferir retorno", n: 3 },
    { id: "fechamento", label: "Fechamento", n: 4 },
  ];
  const passoAtual = { planejada: 0, separando: 1, campo: 2, retornada: 3 }[op.status];
  const etapaAtual = abas[passoAtual];
  const proximaEtapa = abas[passoAtual + 1];
  const orientacao: Record<Operacao["status"], string> = {
    planejada: "Ajuste a equipe e revise os itens previstos por setor.",
    separando: "Separe os equipamentos, confira os itens por quantidade e registre a saída do CD.",
    campo: "Na volta, confira cada patrimônio e registre faltas, excedentes ou avarias.",
    retornada: "O retorno foi fechado. Revise as ocorrências ou exporte os relatórios.",
  };

  return (
    <>
      <Link
        to="/cronograma"
        className="mb-3 inline-flex items-center gap-1 text-sm font-semibold text-muted-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Mutirões
      </Link>
      <div className="mb-5 rounded-2xl border bg-card p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-display text-3xl font-black">{op.local}</h1>
              {op.surpresa && (
                <span className="rounded-md bg-danger px-2 py-0.5 text-xs font-bold text-danger-foreground">
                  ⚡ SURPRESA
                </span>
              )}
              <span
                className={cn("rounded-full px-3 py-1 text-xs font-bold", STATUS_OP[op.status].cls)}
              >
                {STATUS_OP[op.status].label}
              </span>
            </div>
            <p className="mt-1 text-muted-foreground">
              {fmtData(primeiroDia.data)} → {fmtData(ultimaData)} · {op.dias.length} dia(s)
            </p>
            <div className="mt-2 flex flex-wrap gap-1">
              {op.dias.map((d) => (
                <span key={d.data} className="rounded bg-muted px-2 py-0.5 text-xs">
                  <b>{d.data.slice(8)}</b> {d.servicos}
                </span>
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <select
              value={op.modeloId}
              disabled={op.status !== "planejada"}
              onChange={(e) => {
                const modelo = modelos.find((item) => item.id === e.target.value);
                if (modelo)
                  updateOperacao(op.id, { modeloId: modelo.id, setores: setoresDoModelo(modelo) });
              }}
              className={cn(
                "h-10 rounded-lg px-3 text-sm font-bold",
                MODELO_COR[m?.cor ?? "cirurgia"],
              )}
            >
              {modelos.map((x) => (
                <option key={x.id} value={x.id}>
                  {x.nome}
                </option>
              ))}
            </select>
            <Input
              placeholder="Responsável pela saída"
              value={op.responsavel}
              onChange={(e) => updateOperacao(op.id, { responsavel: e.target.value })}
            />
          </div>
        </div>
      </div>

      <div className="mb-3 grid grid-cols-2 gap-2 md:grid-cols-4" aria-label="Etapas do mutirão">
        {abas.map((a) => (
          <button
            key={a.id}
            type="button"
            aria-current={aba === a.id ? "step" : undefined}
            onClick={() => navigate({ search: { aba: a.id } })}
            className={cn(
              "flex min-h-14 items-center gap-2 rounded-xl border-2 p-3 text-left font-bold transition",
              aba === a.id ? "border-ink bg-ink text-ink-foreground" : "bg-card",
            )}
          >
            <span
              className={cn(
                "grid size-8 shrink-0 place-items-center rounded-full text-sm",
                a.n - 1 < passoAtual
                  ? "bg-ok text-ok-foreground"
                  : aba === a.id
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-foreground",
              )}
            >
              {a.n - 1 < passoAtual ? <Check className="h-4 w-4" /> : a.n}
            </span>
            <span className="min-w-0">
              <span className="block text-xs uppercase text-muted-foreground">Etapa {a.n}</span>
              <span className="block leading-tight">{a.label}</span>
            </span>
          </button>
        ))}
      </div>

      <section
        className="mb-5 flex flex-wrap items-center justify-between gap-3 border-l-4 border-primary bg-secondary/40 px-4 py-3"
        aria-live="polite"
      >
        <div>
          <p className="font-mono text-xs font-bold uppercase text-primary">
            {etapaAtual
              ? `Passo ${etapaAtual.n} de ${abas.length} · ${op.status === "retornada" ? "Fluxo concluído" : "Etapa atual"}`
              : "Etapa do mutirão"}
          </p>
          <p className="mt-1 font-semibold">{orientacao[op.status]}</p>
          {etapaAtual && aba !== etapaAtual.id && (
            <p className="mt-1 text-xs text-muted-foreground">
              Sessão aberta: {abas.find((item) => item.id === aba)?.label ?? "Mutirão"}
            </p>
          )}
        </div>
        {proximaEtapa ? (
          <button
            type="button"
            onClick={() => navigate({ search: { aba: proximaEtapa.id } })}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-bold text-primary-foreground"
          >
            Próximo: {proximaEtapa.label}
            <ArrowRight className="size-4" />
          </button>
        ) : (
          <Link
            to="/relatorio"
            className="inline-flex items-center gap-2 rounded-lg border border-primary px-3 py-2 text-sm font-bold text-primary"
          >
            Ir para Relatórios
            <ArrowRight className="size-4" />
          </Link>
        )}
      </section>

      {aba === "equipe" && <AbaEquipe op={op} />}
      {aba === "separar" && <AbaSeparar op={op} />}
      {aba === "retorno" && <AbaRetorno op={op} />}
      {aba === "fechamento" && <AbaFechamento op={op} />}

      {op.status === "planejada" && (
        <button
          onClick={() => {
            if (confirm("Excluir este mutirão?")) {
              removeOperacao(op.id);
              navigate({ to: "/cronograma" });
            }
          }}
          className="mt-8 flex items-center gap-1 text-sm text-danger"
        >
          <Trash2 className="h-4 w-4" /> Excluir mutirão
        </button>
      )}
    </>
  );
}

function AbaEquipe({ op }: { op: Operacao }) {
  const updateOperacao = useStore((s) => s.updateOperacao);
  const navigate = useNavigate({ from: "/operacao/$id" });
  const travado = op.status === "campo" || op.status === "retornada";
  const setSetor = (i: number, p: Partial<Operacao["setores"][number]>) =>
    updateOperacao(op.id, { setores: op.setores.map((s, j) => (j === i ? { ...s, ...p } : s)) });
  const totalEquipe = op.setores.reduce((a, s) => a + s.equipe, 0);
  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-info p-4 text-info-foreground">
        <p className="flex items-center gap-2 font-semibold">
          <Users /> Ajuste quantos funcionários vão em cada setor. Zere o setor para não levar nada.
          Toque no número de um item para mudar manualmente.
        </p>
        <span className="font-display text-2xl font-black">{totalEquipe} pessoas</span>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {op.setores.map((s, i) => (
          <div
            key={s.id}
            className={cn("rounded-2xl border bg-card p-4", s.equipe === 0 && "opacity-50")}
          >
            <div className="mb-3 flex items-center justify-between gap-2">
              <h3 className="font-display text-lg font-bold">{s.nome}</h3>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-muted-foreground">Equipe</span>
                {travado ? (
                  <b>{s.equipe}</b>
                ) : (
                  <Stepper value={s.equipe} onChange={(v) => setSetor(i, { equipe: v })} />
                )}
              </div>
            </div>
            <div className="space-y-1">
              {s.itens.map((it) => {
                const q = qtdItem(s, it.tipoId);
                const manual = s.ajustes[it.tipoId] !== undefined;
                return (
                  <div
                    key={it.tipoId}
                    className="flex items-center justify-between rounded-lg px-2 py-1 odd:bg-muted/60"
                  >
                    <span className="text-sm">
                      {tipoById(it.tipoId)?.nome}{" "}
                      {it.escala && (
                        <span className="text-[10px] font-bold text-info">↕ equipe</span>
                      )}{" "}
                      {manual && <span className="text-[10px] font-bold text-rent">✎ manual</span>}
                    </span>
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        disabled={travado}
                        value={q}
                        onChange={(e) =>
                          setSetor(i, {
                            ajustes: {
                              ...s.ajustes,
                              [it.tipoId]: Math.max(0, +e.target.value || 0),
                            },
                          })
                        }
                        className={cn(
                          "h-8 w-14 rounded-md border text-center font-bold",
                          manual && "border-rent bg-rent/10",
                        )}
                      />
                      {manual && !travado && (
                        <button
                          title="Voltar ao padrão"
                          onClick={() => {
                            const a = { ...s.ajustes };
                            delete a[it.tipoId];
                            setSetor(i, { ajustes: a });
                          }}
                        >
                          <Undo2 className="h-4 w-4 text-muted-foreground" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
      {!travado && (
        <Button
          size="lg"
          className="mt-6 h-14 w-full text-lg font-bold"
          onClick={() => navigate({ search: { aba: "separar" } })}
        >
          Pronto, ir para a lista de separação →
        </Button>
      )}
    </div>
  );
}

function corProgresso(feito: number, total: number) {
  if (feito >= total) return "bg-ok text-ok-foreground border-ok";
  if (feito > 0) return "bg-warn text-warn-foreground border-warn";
  return "bg-danger/10 border-danger text-foreground";
}

function AbaSeparar({ op }: { op: Operacao }) {
  const { equipamentos, estoqueQtd, separar, desfazerSeparacao, despachar, updateOperacao } =
    useStore();
  const navigate = useNavigate({ from: "/operacao/$id" });
  const [pat, setPat] = useState("");
  const [setorSel, setSetorSel] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const dem = demanda(op);
  const quantidadeNecessaria = (tipoId: string) => dem[tipoId] ?? 0;
  const meus = equipamentos.filter((e) => e.operacaoId === op.id);
  const travado = op.status === "campo" || op.status === "retornada";

  const patTipos = TIPOS.filter(
    (t) => t.controle === "patrimonio" && quantidadeNecessaria(t.id) > 0,
  );
  const qtdTipos = TIPOS.filter(
    (t) => t.controle === "quantidade" && quantidadeNecessaria(t.id) > 0,
  );
  const servTipos = TIPOS.filter((t) => t.controle === "servico" && quantidadeNecessaria(t.id) > 0);
  const totalNec =
    patTipos.reduce((a, t) => a + quantidadeNecessaria(t.id), 0) +
    qtdTipos.reduce((a, t) => a + quantidadeNecessaria(t.id), 0);
  const totalFeito =
    patTipos.reduce(
      (a, t) =>
        a + Math.min(quantidadeNecessaria(t.id), meus.filter((e) => e.tipoId === t.id).length),
      0,
    ) +
    qtdTipos.reduce((a, t) => a + Math.min(quantidadeNecessaria(t.id), op.qtdSaida[t.id] || 0), 0);
  const pct = totalNec ? Math.round((totalFeito / totalNec) * 100) : 0;

  const ler = (valor: string) => {
    if (!valor.trim()) return;
    const r = separar(op.id, valor, setorSel || undefined);
    if (r.ok) toast.success(r.msg);
    else toast.error(r.msg);
    setPat("");
    inputRef.current?.focus();
  };
  const submit = (e: FormEvent) => {
    e.preventDefault();
    ler(pat);
  };

  return (
    <div>
      <div className="mb-5 rounded-2xl bg-ink p-5 text-ink-foreground">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <p className="text-sm font-bold uppercase tracking-widest opacity-70">
              O que separar para {op.local}
            </p>
            <p className="font-display text-4xl font-black">
              {totalFeito} / {totalNec} itens
            </p>
          </div>
          <p className="font-display text-5xl font-black">{pct}%</p>
        </div>
        <div className="mt-3 h-4 overflow-hidden rounded-full bg-ink-foreground/20">
          <div
            className={cn("h-full transition-all", pct >= 100 ? "bg-ok" : "bg-warn")}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {!travado && (
        <form onSubmit={submit} className="mb-6 rounded-2xl border-2 border-primary bg-card p-4">
          <p className="mb-2 font-display text-lg font-bold">
            Digite ou leia o patrimônio do equipamento
          </p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              ref={inputRef}
              autoFocus
              value={pat}
              onChange={(e) => setPat(e.target.value)}
              placeholder="Ex.: MS-0123"
              className="h-14 flex-1 font-mono text-xl uppercase"
            />
            <select
              value={setorSel}
              onChange={(e) => setSetorSel(e.target.value)}
              className="h-14 rounded-md border bg-card px-3 text-sm"
            >
              <option value="">Setor (opcional)</option>
              {op.setores
                .filter((s) => s.equipe > 0)
                .map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.nome}
                  </option>
                ))}
            </select>
            <Button type="submit" size="lg" className="h-14 text-base font-bold">
              Separar
            </Button>
            <QrScanner onRead={ler} />
          </div>
        </form>
      )}

      <h2 className="mb-3 text-xl font-bold">Equipamentos com patrimônio</h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {patTipos.map((t) => {
          const lista = meus.filter((e) => e.tipoId === t.id);
          const disp = equipamentos.filter(
            (e) => e.tipoId === t.id && e.status === "disponivel",
          ).length;
          const quantidade = quantidadeNecessaria(t.id);
          const falta = Math.max(0, quantidade - lista.length);
          return (
            <div
              key={t.id}
              className={cn("rounded-2xl border-2 p-4", corProgresso(lista.length, quantidade))}
            >
              <div className="flex items-start justify-between gap-2">
                <p className="font-display text-lg font-extrabold leading-tight">{t.nome}</p>
                <p className="font-display text-3xl font-black">
                  {lista.length}/{quantidade}
                </p>
              </div>
              {falta > 0 && (
                <p className="mt-1 text-sm font-bold">
                  Faltam {falta} · {disp} disponíveis no CD{" "}
                  {disp < falta && <span className="text-danger">⚠ estoque insuficiente</span>}
                </p>
              )}
              <div className="mt-2 space-y-1">
                {lista.map((e) => (
                  <div
                    key={e.id}
                    className="flex items-center justify-between rounded-lg bg-card/90 px-2 py-1 text-sm text-foreground"
                  >
                    <span className="font-mono font-bold">{e.patrimonio}</span>
                    <span className="flex items-center gap-1">
                      <OrigemBadge origem={e.origem} />
                      {!travado && (
                        <button onClick={() => desfazerSeparacao(e.id)} title="Desfazer">
                          <Undo2 className="h-4 w-4" />
                        </button>
                      )}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <h2 className="mb-3 mt-8 text-xl font-bold">Itens por quantidade e insumos</h2>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {qtdTipos.map((t) => {
          const v = op.qtdSaida[t.id] || 0;
          return (
            <div
              key={t.id}
              className={cn(
                "flex items-center justify-between rounded-xl border-2 p-3",
                corProgresso(v, quantidadeNecessaria(t.id)),
              )}
            >
              <div>
                <p className="font-bold">{t.nome}</p>
                <p className="text-xs">
                  Precisa {quantidadeNecessaria(t.id)} · CD tem {estoqueQtd[t.id] || 0}
                </p>
              </div>
              {travado ? (
                <b className="text-xl">{v}</b>
              ) : (
                <div className="flex items-center gap-1">
                  <Stepper
                    value={v}
                    onChange={(n) =>
                      updateOperacao(op.id, { qtdSaida: { ...op.qtdSaida, [t.id]: n } })
                    }
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      updateOperacao(op.id, {
                        qtdSaida: { ...op.qtdSaida, [t.id]: quantidadeNecessaria(t.id) },
                      })
                    }
                  >
                    OK
                  </Button>
                </div>
              )}
            </div>
          );
        })}
        {servTipos.map((t) => (
          <label
            key={t.id}
            className={cn(
              "flex cursor-pointer items-center justify-between rounded-xl border-2 p-3",
              op.servicosOk[t.id]
                ? "border-ok bg-ok text-ok-foreground"
                : "border-danger bg-danger/10",
            )}
          >
            <span className="font-bold">{t.nome} (contratado/testado)</span>
            <input
              type="checkbox"
              disabled={travado}
              className="h-6 w-6"
              checked={!!op.servicosOk[t.id]}
              onChange={(e) =>
                updateOperacao(op.id, {
                  servicosOk: { ...op.servicosOk, [t.id]: e.target.checked },
                })
              }
            />
          </label>
        ))}
      </div>

      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <Button
          variant="outline"
          size="lg"
          className="h-14 gap-2"
          onClick={() => pdfRomaneio(op, equipamentos, "saida")}
        >
          <FileDown /> PDF romaneio de saída
        </Button>
        {!travado && (
          <Button
            size="lg"
            className="h-14 flex-1 gap-2 bg-info text-lg font-bold text-info-foreground hover:bg-info/90"
            onClick={() => {
              if (pct < 100 && !confirm(`Ainda faltam itens (${pct}%). Despachar mesmo assim?`))
                return;
              const result = despachar(op.id);
              if (!result.ok) {
                toast.error(result.msg);
                return;
              }
              toast.success(result.msg || "Kit despachado.");
              navigate({ search: { aba: "retorno" } });
            }}
          >
            <Truck /> Despachar kit (saída do CD)
          </Button>
        )}
      </div>
    </div>
  );
}

function AbaRetorno({ op }: { op: Operacao }) {
  const { equipamentos, conferirRetorno, updateOperacao, finalizarRetorno, addOcorrencia } =
    useStore();
  const navigate = useNavigate({ from: "/operacao/$id" });
  const [pat, setPat] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  if (op.status !== "campo")
    return (
      <div className="rounded-2xl border bg-card p-8 text-center text-muted-foreground">
        {op.status === "retornada"
          ? "Retorno já finalizado — veja o Fechamento."
          : "Despache o kit primeiro para conferir o retorno."}
      </div>
    );

  const meus = equipamentos.filter((e) => e.operacaoId === op.id);
  const voltou = meus.filter((e) => op.retornados.includes(e.id));
  const falta = meus.filter((e) => !op.retornados.includes(e.id));
  const qtdTipos = TIPOS.filter((t) => (op.qtdSaida[t.id] ?? 0) > 0);

  const ler = (v: string) => {
    if (!v.trim()) return;
    const r = conferirRetorno(op.id, v);
    if (r.ok) toast.success(r.msg);
    else if (r.msg.includes("não saiu nesta")) {
      if (confirm(`${r.msg}\n\nRegistrar como EXCEDENTE (veio a mais)?`)) {
        const eq = equipamentos.find((e) => e.patrimonio === v.trim().toUpperCase());
        addOcorrencia(op.id, {
          tipo: "excedente",
          patrimonio: v.trim().toUpperCase(),
          ...(eq ? { tipoId: eq.tipoId } : {}),
          qtd: 1,
          obs: "Chegou no retorno mas não saiu neste mutirão",
        });
      }
    } else toast.error(r.msg);
    setPat("");
    inputRef.current?.focus();
  };

  return (
    <div>
      <div className="mb-5 grid grid-cols-2 gap-3">
        <div className="rounded-2xl bg-ok p-5 text-ok-foreground">
          <p className="font-display text-5xl font-black">{voltou.length}</p>
          <p className="font-bold">Voltaram</p>
        </div>
        <div
          className={cn(
            "rounded-2xl p-5",
            falta.length ? "bg-danger text-danger-foreground" : "bg-ok text-ok-foreground",
          )}
        >
          <p className="font-display text-5xl font-black">{falta.length}</p>
          <p className="font-bold">Ainda faltam</p>
        </div>
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          ler(pat);
        }}
        className="mb-6 rounded-2xl border-2 border-info bg-card p-4"
      >
        <p className="mb-2 font-display text-lg font-bold">Conferir item que chegou</p>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input
            ref={inputRef}
            autoFocus
            value={pat}
            onChange={(e) => setPat(e.target.value)}
            placeholder="Patrimônio"
            className="h-14 flex-1 font-mono text-xl uppercase"
          />
          <Button type="submit" size="lg" className="h-14 bg-info font-bold text-info-foreground">
            Conferir
          </Button>
          <QrScanner onRead={ler} />
        </div>
      </form>
      <div className="grid gap-6 lg:grid-cols-2">
        <div>
          <h3 className="mb-2 text-lg font-bold text-danger">Faltando ({falta.length})</h3>
          {falta.map((e) => (
            <div
              key={e.id}
              className="mb-1 flex items-center justify-between rounded-lg border-2 border-danger bg-danger/10 px-3 py-2"
            >
              <span>
                <b className="font-mono">{e.patrimonio}</b> · {tipoById(e.tipoId)?.nome} ·{" "}
                {e.modelo}
              </span>
              <span className="flex items-center gap-2">
                <OrigemBadge origem={e.origem} />
                <Button size="sm" variant="outline" onClick={() => ler(e.patrimonio)}>
                  Voltou
                </Button>
              </span>
            </div>
          ))}
        </div>
        <div>
          <h3 className="mb-2 text-lg font-bold text-ok">Conferidos ({voltou.length})</h3>
          {voltou.map((e) => (
            <div
              key={e.id}
              className="mb-1 flex items-center justify-between rounded-lg bg-ok/15 px-3 py-2"
            >
              <span>
                <Check className="mr-1 inline h-4 w-4 text-ok" />
                <b className="font-mono">{e.patrimonio}</b> · {tipoById(e.tipoId)?.nome}
              </span>
              <button
                className="text-xs text-muted-foreground underline"
                onClick={() =>
                  updateOperacao(op.id, { retornados: op.retornados.filter((x) => x !== e.id) })
                }
              >
                desfazer
              </button>
            </div>
          ))}
        </div>
      </div>
      {qtdTipos.length > 0 && (
        <>
          <h3 className="mb-2 mt-6 text-lg font-bold">Itens por quantidade que voltaram</h3>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {qtdTipos.map((t) => {
              const v = op.qtdRetorno[t.id] || 0;
              return (
                <div
                  key={t.id}
                  className={cn(
                    "flex items-center justify-between rounded-xl border-2 p-3",
                    corProgresso(v, op.qtdSaida[t.id] ?? 0),
                  )}
                >
                  <div>
                    <p className="font-bold">{t.nome}</p>
                    <p className="text-xs">
                      Saíram {op.qtdSaida[t.id] ?? 0}
                      {t.grupo === "Insumos" && " (insumo pode ser consumido)"}
                    </p>
                  </div>
                  <Stepper
                    value={v}
                    onChange={(n) =>
                      updateOperacao(op.id, { qtdRetorno: { ...op.qtdRetorno, [t.id]: n } })
                    }
                  />
                </div>
              );
            })}
          </div>
        </>
      )}
      <Ocorrencias op={op} />
      <Button
        size="lg"
        className="mt-8 h-14 w-full bg-ok text-lg font-bold text-ok-foreground hover:bg-ok/90"
        onClick={() => {
          if (
            falta.length &&
            !confirm(
              `${falta.length} equipamento(s) não conferidos serão registrados como FALTANTES e vão para Manutenção. Finalizar?`,
            )
          )
            return;
          const result = finalizarRetorno(op.id);
          if (!result.ok) {
            toast.error(result.msg);
            return;
          }
          toast.success(result.msg || "Retorno finalizado.");
          navigate({ search: { aba: "fechamento" } });
        }}
      >
        Finalizar retorno e fechar mutirão
      </Button>
    </div>
  );
}

const OC_COR: Record<TipoOcorrencia, string> = {
  faltante: "bg-danger text-danger-foreground",
  danificado: "bg-rent text-rent-foreground",
  excedente: "bg-warn text-warn-foreground",
};

function Ocorrencias({ op }: { op: Operacao }) {
  const { addOcorrencia, removeOcorrencia } = useStore();
  const [tipo, setTipo] = useState<TipoOcorrencia>("danificado");
  const [patr, setPatr] = useState("");
  const [tipoId, setTipoId] = useState("");
  const [qtd, setQtd] = useState(1);
  const [obs, setObs] = useState("");
  const lista = op.ocorrencias || [];
  return (
    <div className="mt-8 rounded-2xl border-2 border-danger/40 bg-card p-4">
      <h3 className="mb-3 flex items-center gap-2 text-lg font-bold">
        <AlertTriangle className="text-danger" /> Registrar ocorrência
      </h3>
      <div className="mb-3 grid grid-cols-3 gap-2">
        {(["faltante", "danificado", "excedente"] as TipoOcorrencia[]).map((t) => (
          <button
            key={t}
            onClick={() => setTipo(t)}
            className={cn(
              "rounded-xl border-2 p-3 font-bold capitalize",
              tipo === t ? OC_COR[t] : "bg-background",
            )}
          >
            {t}
          </button>
        ))}
      </div>
      <div className="grid gap-2 sm:grid-cols-3">
        <Input
          placeholder="Patrimônio (se tiver)"
          value={patr}
          onChange={(e) => setPatr(e.target.value)}
          className="h-12 font-mono uppercase"
        />
        <select
          value={tipoId}
          onChange={(e) => setTipoId(e.target.value)}
          className="h-12 rounded-md border bg-card px-3 text-sm"
        >
          <option value="">Tipo de item…</option>
          {TIPOS.map((t) => (
            <option key={t.id} value={t.id}>
              {t.nome}
            </option>
          ))}
        </select>
        <Stepper value={qtd} min={1} onChange={setQtd} />
      </div>
      <Textarea
        placeholder="Observações (ex.: tela quebrada, ficou com a coordenadora, etc.)"
        value={obs}
        onChange={(e) => setObs(e.target.value)}
        className="mt-2"
      />
      <Button
        className="mt-2"
        onClick={() => {
          if (!patr && !tipoId) {
            toast.error("Informe patrimônio ou tipo do item");
            return;
          }
          const patrimonio = patr.trim().toUpperCase();
          addOcorrencia(op.id, {
            tipo,
            ...(patrimonio ? { patrimonio } : {}),
            ...(tipoId ? { tipoId } : {}),
            qtd,
            obs,
          });
          setPatr("");
          setObs("");
          setQtd(1);
          toast.success("Ocorrência registrada");
        }}
      >
        Registrar
      </Button>
      {lista.length > 0 && (
        <div className="mt-4 space-y-1">
          {lista.map((o) => (
            <div
              key={o.id}
              className="flex items-center justify-between rounded-lg bg-muted px-3 py-2 text-sm"
            >
              <span>
                <b className={cn("mr-2 rounded px-2 py-0.5 text-xs uppercase", OC_COR[o.tipo])}>
                  {o.tipo}
                </b>
                {o.qtd}× {o.patrimonio ?? ""} {o.tipoId ? tipoById(o.tipoId)?.nome : ""}{" "}
                {o.obs && `— ${o.obs}`}
              </span>
              <button onClick={() => removeOcorrencia(op.id, o.id)}>
                <Trash2 className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function AbaFechamento({ op }: { op: Operacao }) {
  const { equipamentos, movimentos } = useStore();
  if (op.status !== "retornada")
    return (
      <div className="rounded-2xl border bg-card p-8 text-center text-muted-foreground">
        O fechamento aparece após finalizar o retorno.
      </div>
    );
  const lista = op.ocorrencias || [];
  const cont = (t: TipoOcorrencia) =>
    lista.filter((o) => o.tipo === t).reduce((a, o) => a + o.qtd, 0);
  const saidaIds = movimentos
    .filter((m) => m.operacaoId === op.id && m.tipo === "separacao")
    .map((m) => m.equipamentoId);
  const enviados = equipamentos.filter((e) => saidaIds.includes(e.id));
  const fakeOp = { ...op, retornados: op.retornados };
  return (
    <div>
      <div
        className={cn(
          "mb-5 rounded-2xl p-6",
          lista.length ? "bg-danger text-danger-foreground" : "bg-ok text-ok-foreground",
        )}
      >
        <p className="font-display text-3xl font-black">
          {lista.length
            ? `⚠ ${lista.length} ocorrência(s) neste mutirão`
            : "✓ Tudo voltou certinho!"}
        </p>
        <p className="mt-1 font-semibold">
          {op.retornados.length} equipamentos conferidos no retorno.
        </p>
      </div>
      <div className="mb-5 grid grid-cols-3 gap-3">
        {(["faltante", "danificado", "excedente"] as TipoOcorrencia[]).map((t) => (
          <div key={t} className={cn("rounded-2xl p-4", cont(t) ? OC_COR[t] : "bg-muted")}>
            <p className="font-display text-4xl font-black">{cont(t)}</p>
            <p className="font-bold capitalize">{t}s</p>
          </div>
        ))}
      </div>
      {lista.length > 0 && (
        <div className="mb-5 space-y-2">
          {lista.map((o) => (
            <div
              key={o.id}
              className={cn(
                "rounded-xl border-l-8 bg-card p-4",
                o.tipo === "faltante"
                  ? "border-danger"
                  : o.tipo === "danificado"
                    ? "border-rent"
                    : "border-warn",
              )}
            >
              <p className="font-bold">
                <span className={cn("mr-2 rounded px-2 py-0.5 text-xs uppercase", OC_COR[o.tipo])}>
                  {o.tipo}
                </span>
                {o.qtd}× {o.patrimonio && <span className="font-mono">{o.patrimonio} </span>}
                {o.tipoId && tipoById(o.tipoId)?.nome}
              </p>
              {o.obs && <p className="mt-1 text-sm text-muted-foreground">{o.obs}</p>}
            </div>
          ))}
        </div>
      )}
      <Ocorrencias op={op} />
      <Button
        variant="outline"
        size="lg"
        className="mt-6 h-14 gap-2"
        onClick={() =>
          pdfRomaneio(
            fakeOp,
            enviados.map((e) => ({ ...e, operacaoId: op.id })),
            "retorno",
          )
        }
      >
        <FileDown /> PDF de conferência de retorno
      </Button>
    </div>
  );
}
