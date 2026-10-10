import { createFileRoute, Link } from "@tanstack/react-router";
import { AlertTriangle, ArrowRight, Boxes, PackageCheck, Truck, Wrench, Zap } from "lucide-react";
import { useStore, fmtData, hojeISO, STATUS_OP } from "@/lib/store";
import { MODELO_COR, PageTitle } from "@/components/app-shell";
import { DATAS_ESPECIAIS } from "@/lib/catalog";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Painel · Controle T.I." },
      {
        name: "description",
        content: "Visão do dia: mutirões, equipamentos em campo, pendências de retorno e estoque.",
      },
      { property: "og:title", content: "Painel · Controle T.I." },
      {
        property: "og:description",
        content: "Visão do dia dos equipamentos de TI dos mutirões.",
      },
    ],
  }),
  component: Painel,
});

function Painel() {
  const { equipamentos, operacoes, movimentos } = useStore();
  const hoje = hojeISO();
  const dHoje = operacoes.filter((o) => o.dias.some((d) => d.data === hoje));
  const proximos = operacoes
    .filter(
      (o) =>
        (o.status === "planejada" || o.status === "separando") && (o.dias[0]?.data ?? "") >= hoje,
    )
    .slice(0, 6);
  const emCampo = operacoes.filter((o) => o.status === "campo");
  const cont = (s: string) => equipamentos.filter((e) => e.status === s).length;
  const ocorr = operacoes
    .flatMap((o) => (o.ocorrencias || []).map((x) => ({ ...x, local: o.local, opId: o.id })))
    .slice(-5)
    .reverse();

  const kpis = [
    {
      label: "Disponíveis no CD",
      v: cont("disponivel"),
      icon: Boxes,
      cls: "bg-ok text-ok-foreground",
    },
    {
      label: "Separados",
      v: cont("separado"),
      icon: PackageCheck,
      cls: "bg-warn text-warn-foreground",
    },
    { label: "Em campo", v: cont("campo"), icon: Truck, cls: "bg-info text-info-foreground" },
    {
      label: "Manutenção",
      v: cont("manutencao"),
      icon: Wrench,
      cls: "bg-danger text-danger-foreground",
    },
  ];

  return (
    <>
      <PageTitle
        title="Bom trabalho! 👋"
        sub={`Hoje é ${fmtData(hoje)}${DATAS_ESPECIAIS[hoje] ? ` · ${DATAS_ESPECIAIS[hoje]}` : ""}`}
      >
        <Link
          to="/cronograma"
          search={{ surpresa: true }}
          className="flex items-center gap-2 rounded-xl bg-danger px-5 py-3 font-bold text-danger-foreground shadow-lg"
        >
          <Zap className="h-5 w-5" /> Mutirão surpresa
        </Link>
        <Link
          to="/entrada"
          className="flex items-center gap-2 rounded-xl bg-primary px-5 py-3 font-bold text-primary-foreground"
        >
          + Cadastrar equipamento
        </Link>
      </PageTitle>

      {equipamentos.length === 0 && (
        <div className="mb-6 rounded-2xl border-2 border-dashed border-primary bg-primary/10 p-5">
          <p className="font-display text-xl font-bold">Estoque zerado — vamos começar!</p>
          <p className="mt-1 text-muted-foreground">
            1) Cadastre cada equipamento em <b>Entrada</b> (patrimônio, modelo, alugado ou
            patrimonial). 2) Abra o mutirão em <b>Mutirões</b> e separe o kit. 3) No fim do dia,
            gere o <b>relatório diário</b>.
          </p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {kpis.map((k) => (
          <div key={k.label} className={cn("rounded-2xl p-4", k.cls)}>
            <k.icon className="h-6 w-6 opacity-80" />
            <p className="mt-2 font-display text-4xl font-black">{k.v}</p>
            <p className="text-sm font-semibold opacity-90">{k.label}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <section className="rounded-2xl border bg-card p-5 lg:col-span-2">
          <h2 className="mb-3 text-xl font-bold">Mutirões de hoje ({dHoje.length})</h2>
          {dHoje.length === 0 && (
            <p className="text-muted-foreground">Nenhum mutirão no cronograma para hoje.</p>
          )}
          <div className="grid gap-3 sm:grid-cols-2">
            {dHoje.map((o) => (
              <CardOp key={o.id} id={o.id} />
            ))}
          </div>
          <h2 className="mb-3 mt-6 text-xl font-bold">Próximos a separar</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {proximos.map((o) => (
              <CardOp key={o.id} id={o.id} />
            ))}
          </div>
        </section>
        <aside className="space-y-6">
          <section className="rounded-2xl border bg-card p-5">
            <h2 className="mb-3 text-xl font-bold">Aguardando retorno</h2>
            {emCampo.length === 0 && <p className="text-muted-foreground">Nada em campo.</p>}
            {emCampo.map((o) => {
              const n = equipamentos.filter((e) => e.operacaoId === o.id).length;
              const ultimaData = o.dias[o.dias.length - 1]?.data;
              const atrasado = ultimaData !== undefined && ultimaData < hoje;
              return (
                <Link
                  key={o.id}
                  to="/operacao/$id"
                  params={{ id: o.id }}
                  search={{ aba: "retorno" }}
                  className={cn(
                    "mb-2 flex items-center justify-between rounded-xl p-3 font-semibold",
                    atrasado ? "bg-danger text-danger-foreground" : "bg-info/15",
                  )}
                >
                  <span>
                    {o.local} · {n} equip.{atrasado && " · ATRASADO"}
                  </span>
                  <ArrowRight className="h-4 w-4" />
                </Link>
              );
            })}
          </section>
          {ocorr.length > 0 && (
            <section className="rounded-2xl border-2 border-danger bg-card p-5">
              <h2 className="mb-3 flex items-center gap-2 text-xl font-bold text-danger">
                <AlertTriangle /> Ocorrências recentes
              </h2>
              {ocorr.map((o) => (
                <p key={o.id} className="mb-1 text-sm">
                  <b className="uppercase">{o.tipo}</b> · {o.qtd}× {o.patrimonio || o.tipoId} ·{" "}
                  {o.local}
                </p>
              ))}
            </section>
          )}
          <section className="rounded-2xl border bg-card p-5">
            <h2 className="mb-3 text-xl font-bold">Últimas movimentações</h2>
            {movimentos.slice(0, 8).map((m) => (
              <p key={m.id} className="border-b py-1.5 text-sm last:border-0">
                <span className="text-muted-foreground">
                  {new Date(m.ts).toLocaleTimeString("pt-BR", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>{" "}
                {m.texto}
              </p>
            ))}
            {movimentos.length === 0 && (
              <p className="text-muted-foreground">Sem movimentações ainda.</p>
            )}
          </section>
        </aside>
      </div>
    </>
  );
}

export function CardOp({ id }: { id: string }) {
  const o = useStore((s) => s.operacoes.find((x) => x.id === id));
  const modelos = useStore((s) => s.modelos);
  if (!o || !o.dias.length) return null;
  const m = modelos.find((x) => x.id === o.modeloId);
  const st = STATUS_OP[o.status];
  const dataInicial = o.dias[0];
  if (!dataInicial) return null;
  const dataFinal = o.dias[o.dias.length - 1]?.data;
  return (
    <Link
      to="/operacao/$id"
      params={{ id: o.id }}
      className="block rounded-xl border-2 bg-background p-4 transition hover:border-primary"
    >
      <div className="flex items-center justify-between gap-2">
        <p className="font-display text-lg font-extrabold">{o.local}</p>
        <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-bold", st.cls)}>
          {st.label}
        </span>
      </div>
      <p className="text-sm text-muted-foreground">
        {fmtData(dataInicial.data)}
        {dataFinal && o.dias.length > 1 && ` → ${fmtData(dataFinal)}`} · {o.dias.length} dia(s)
      </p>
      <div className="mt-2 flex flex-wrap gap-1">
        <span
          className={cn(
            "rounded-md px-2 py-0.5 text-xs font-bold",
            MODELO_COR[o.surpresa ? "surpresa" : (m?.cor ?? "cirurgia")],
          )}
        >
          {o.surpresa ? "⚡ SURPRESA · " : ""}
          {m?.nome}
        </span>
      </div>
      <p className="mt-2 line-clamp-1 text-xs text-muted-foreground">{dataInicial.servicos}</p>
    </Link>
  );
}
