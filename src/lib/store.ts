import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  CRONOGRAMA_OUT_2026,
  MODELOS_PADRAO,
  consolidarItensDuplicados,
  detectarModelo,
  iso,
  tipoById,
  type Modelo,
  type Setor,
} from "./catalog";

export type Origem = "patrimonial" | "alugado";
export type StatusEquip = "disponivel" | "separado" | "campo" | "manutencao" | "baixa";

export interface Equipamento {
  id: string;
  tipoId: string;
  patrimonio: string;
  modelo: string;
  serie: string;
  origem: Origem;
  fornecedor: string;
  status: StatusEquip;
  operacaoId?: string;
  setorId?: string;
  obs: string;
  criadoEm: string;
}

export type StatusOp = "planejada" | "separando" | "campo" | "retornada";

export interface SetorOp extends Setor {
  equipe: number; // nº de funcionários escalados (editável)
  ajustes: Record<string, number>; // tipoId -> quantidade manual (override)
}

export type TipoOcorrencia = "faltante" | "excedente" | "danificado";
export interface Ocorrencia {
  id: string;
  tipo: TipoOcorrencia;
  tipoId?: string;
  patrimonio?: string;
  qtd: number;
  obs: string;
  ts: string;
  auto?: boolean;
}

export interface Operacao {
  id: string;
  local: string;
  dias: { data: string; servicos: string }[];
  modeloId: string;
  setores: SetorOp[];
  status: StatusOp;
  surpresa: boolean;
  qtdSaida: Record<string, number>; // itens por quantidade enviados
  qtdRetorno: Record<string, number>;
  servicosOk: Record<string, boolean>;
  retornados: string[]; // ids de equipamentos conferidos no retorno
  responsavel: string;
  obs: string;
  ocorrencias?: Ocorrencia[];
}

export type TipoMov =
  "entrada" | "separacao" | "saida" | "retorno" | "manutencao" | "ajuste" | "falta";
export interface Movimento {
  id: string;
  ts: string;
  tipo: TipoMov;
  texto: string;
  operacaoId?: string;
  equipamentoId?: string;
}

export const uid = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36);

export function setoresDoModelo(m: Modelo): SetorOp[] {
  return m.setores.map((s) => ({ ...structuredClone(s), equipe: s.equipeBase, ajustes: {} }));
}

function semearOperacoes(modelos: Modelo[]): Operacao[] {
  const porLocal = new Map<string, { dia: number; servicos: string }[]>();
  for (const [dia, local, servicos] of CRONOGRAMA_OUT_2026) {
    if (!porLocal.has(local)) porLocal.set(local, []);
    porLocal.get(local)!.push({ dia, servicos });
  }
  const ops: Operacao[] = [];
  for (const [local, lista] of porLocal) {
    lista.sort((a, b) => a.dia - b.dia);
    let grupo: typeof lista = [];
    const flush = () => {
      if (!grupo.length) return;
      const modeloId = detectarModelo(grupo.map((g) => g.servicos).join(" "));
      const m = modelos.find((x) => x.id === modeloId)!;
      ops.push({
        id: uid(),
        local,
        dias: grupo.map((g) => ({ data: iso(g.dia), servicos: g.servicos })),
        modeloId,
        setores: setoresDoModelo(m),
        status: "planejada",
        surpresa: false,
        qtdSaida: {},
        qtdRetorno: {},
        servicosOk: {},
        retornados: [],
        responsavel: "",
        obs: "",
      });
      grupo = [];
    };
    for (const g of lista) {
      const ult = grupo[grupo.length - 1];
      if (ult && g.dia !== ult.dia + 1) flush();
      grupo.push(g);
    }
    flush();
  }
  return ops.sort((a, b) => (a.dias[0]?.data ?? "").localeCompare(b.dias[0]?.data ?? ""));
}

function desvincularEquipamento(
  equipamento: Equipamento,
  status: StatusEquip,
  obs = equipamento.obs,
): Equipamento {
  const atualizado: Equipamento = { ...equipamento, status, obs };
  delete atualizado.operacaoId;
  delete atualizado.setorId;
  return atualizado;
}

/** Quantidade exigida de um item num setor, considerando equipe e ajuste manual. */
export function qtdItem(s: SetorOp, tipoId: string): number {
  if (s.ajustes[tipoId] !== undefined) return s.ajustes[tipoId];
  const it = s.itens.find((i) => i.tipoId === tipoId);
  if (!it || s.equipe <= 0) return 0;
  if (!it.escala) return it.qtd;
  return (
    Math.max(1, Math.ceil((it.qtd * s.equipe) / Math.max(1, s.equipeBase))) +
    (it.adicionalFixo ?? 0)
  );
}

/** Soma do que a operação precisa, por tipo. */
export function demanda(op: Operacao): Record<string, number> {
  const tot: Record<string, number> = {};
  for (const s of op.setores) {
    const ids = new Set([...s.itens.map((i) => i.tipoId), ...Object.keys(s.ajustes)]);
    for (const t of ids) {
      const q = qtdItem(s, t);
      if (q > 0) tot[t] = (tot[t] || 0) + q;
    }
  }
  return tot;
}

interface ResultadoAcao {
  ok: boolean;
  msg?: string;
}

interface Estado {
  equipamentos: Equipamento[];
  estoqueQtd: Record<string, number>; // itens por quantidade disponíveis no CD
  operacoes: Operacao[];
  modelos: Modelo[];
  movimentos: Movimento[];
  log: (tipo: TipoMov, texto: string, extra?: Partial<Movimento>) => void;
  addEquip: (e: Omit<Equipamento, "id" | "criadoEm" | "status">) => { ok: boolean; msg?: string };
  updateEquip: (id: string, p: Partial<Equipamento>) => void;
  ajustarQtd: (tipoId: string, delta: number, motivo?: string) => ResultadoAcao;
  addOperacao: (
    op: Partial<Operacao> & { local: string; dias: Operacao["dias"]; modeloId: string },
  ) => string;
  updateOperacao: (id: string, p: Partial<Operacao>) => void;
  removeOperacao: (id: string) => void;
  separar: (opId: string, patrimonio: string, setorId?: string) => { ok: boolean; msg: string };
  desfazerSeparacao: (equipId: string) => void;
  despachar: (opId: string) => ResultadoAcao;
  conferirRetorno: (opId: string, patrimonio: string) => { ok: boolean; msg: string };
  finalizarRetorno: (opId: string) => ResultadoAcao;
  addOcorrencia: (opId: string, o: Omit<Ocorrencia, "id" | "ts">) => void;
  removeOcorrencia: (opId: string, id: string) => void;
  updateModelo: (m: Modelo) => void;
  resetCronograma: () => void;
}

export const useStore = create<Estado>()(
  persist(
    (set, get) => ({
      equipamentos: [],
      estoqueQtd: {},
      operacoes: semearOperacoes(MODELOS_PADRAO),
      modelos: structuredClone(MODELOS_PADRAO),
      movimentos: [],

      log: (tipo, texto, extra) =>
        set((s) => ({
          movimentos: [
            { id: uid(), ts: new Date().toISOString(), tipo, texto, ...extra },
            ...s.movimentos,
          ].slice(0, 5000),
        })),

      addEquip: (e) => {
        const pat = e.patrimonio.trim().toUpperCase();
        if (!pat) return { ok: false, msg: "Informe o patrimônio / etiqueta" };
        if (get().equipamentos.some((x) => x.patrimonio === pat))
          return { ok: false, msg: `Patrimônio ${pat} já cadastrado` };
        const novo: Equipamento = {
          ...e,
          patrimonio: pat,
          id: uid(),
          criadoEm: new Date().toISOString(),
          status: "disponivel",
        };
        set((s) => ({ equipamentos: [novo, ...s.equipamentos] }));
        get().log(
          "entrada",
          `Entrada: ${tipoById(e.tipoId)?.nome} ${pat} (${e.origem === "alugado" ? "Alugado" : "Patrimonial"})`,
          { equipamentoId: novo.id },
        );
        return { ok: true };
      },
      updateEquip: (id, p) => {
        const antes = get().equipamentos.find((x) => x.id === id);
        set((s) => ({
          equipamentos: s.equipamentos.map((x) => (x.id === id ? { ...x, ...p } : x)),
        }));
        if (antes && p.status && p.status !== antes.status) {
          get().log(
            p.status === "manutencao" ? "manutencao" : "ajuste",
            `${antes.patrimonio}: ${antes.status} → ${p.status}`,
            { equipamentoId: id },
          );
        }
      },
      ajustarQtd: (tipoId, delta, motivo) => {
        const anterior = get().estoqueQtd[tipoId] || 0;
        const proximo = anterior + delta;
        if (!Number.isInteger(delta) || delta === 0)
          return { ok: false, msg: "Informe uma quantidade inteira diferente de zero." };
        if (delta < 0 && !motivo?.trim())
          return { ok: false, msg: "Informe o motivo da retirada para registrar o ajuste." };
        if (proximo < 0)
          return { ok: false, msg: `Saldo insuficiente. Há ${anterior} unidade(s) no CD.` };
        set((s) => ({ estoqueQtd: { ...s.estoqueQtd, [tipoId]: proximo } }));
        get().log(
          delta > 0 ? "entrada" : "ajuste",
          `${delta > 0 ? "+" : ""}${delta} ${tipoById(tipoId)?.nome}${motivo?.trim() ? ` (${motivo.trim()})` : ""}`,
        );
        return { ok: true };
      },

      addOperacao: (op) => {
        const m = get().modelos.find((x) => x.id === op.modeloId);
        if (!m) throw new Error("Modelo de equipamento não encontrado.");
        if (!op.dias.length) throw new Error("Informe pelo menos um dia para o mutirão.");
        const id = uid();
        const nova: Operacao = {
          id,
          setores: setoresDoModelo(m),
          status: "planejada",
          surpresa: false,
          qtdSaida: {},
          qtdRetorno: {},
          servicosOk: {},
          retornados: [],
          responsavel: "",
          obs: "",
          ...op,
        };
        set((s) => ({
          operacoes: [...s.operacoes, nova].sort((a, b) =>
            (a.dias[0]?.data ?? "").localeCompare(b.dias[0]?.data ?? ""),
          ),
        }));
        return id;
      },
      updateOperacao: (id, p) =>
        set((s) => ({ operacoes: s.operacoes.map((o) => (o.id === id ? { ...o, ...p } : o)) })),
      removeOperacao: (id) =>
        set((s) => ({
          operacoes: s.operacoes.filter((o) => o.id !== id),
          equipamentos: s.equipamentos.map((e) =>
            e.operacaoId === id && e.status === "separado"
              ? desvincularEquipamento(e, "disponivel")
              : e,
          ),
        })),

      separar: (opId, patrimonio, setorId) => {
        const pat = patrimonio.trim().toUpperCase();
        const eq = get().equipamentos.find((x) => x.patrimonio === pat);
        if (!eq)
          return {
            ok: false,
            msg: `Patrimônio ${pat} não encontrado. Cadastre antes em "Entrada".`,
          };
        if (eq.status !== "disponivel")
          return { ok: false, msg: `${pat} não está disponível (status: ${eq.status}).` };
        const op = get().operacoes.find((o) => o.id === opId);
        if (!op) return { ok: false, msg: "Mutirão não encontrado." };
        set((s) => ({
          equipamentos: s.equipamentos.map((x) =>
            x.id === eq.id
              ? { ...x, status: "separado", operacaoId: opId, ...(setorId ? { setorId } : {}) }
              : x,
          ),
          operacoes: s.operacoes.map((o) =>
            o.id === opId && o.status === "planejada" ? { ...o, status: "separando" } : o,
          ),
        }));
        get().log("separacao", `Separado ${tipoById(eq.tipoId)?.nome} ${pat} → ${op.local}`, {
          operacaoId: opId,
          equipamentoId: eq.id,
        });
        return { ok: true, msg: `${tipoById(eq.tipoId)?.nome} ${pat} separado ✓` };
      },
      desfazerSeparacao: (equipId) =>
        set((s) => ({
          equipamentos: s.equipamentos.map((x) =>
            x.id === equipId ? desvincularEquipamento(x, "disponivel") : x,
          ),
        })),

      despachar: (opId) => {
        const op = get().operacoes.find((o) => o.id === opId);
        if (!op) return { ok: false, msg: "Mutirão não encontrado." };
        if (op.status !== "planejada" && op.status !== "separando") {
          return { ok: false, msg: "Este mutirão já foi despachado ou encerrado." };
        }
        const invalidos = Object.entries(op.qtdSaida).filter(
          ([, quantidade]) => !Number.isInteger(quantidade) || quantidade < 0,
        );
        if (invalidos.length)
          return {
            ok: false,
            msg: "As quantidades separadas precisam ser números inteiros iguais ou maiores que zero.",
          };
        const insuficientes = Object.entries(op.qtdSaida).filter(([tipoId, quantidade]) => {
          return quantidade > (get().estoqueQtd[tipoId] || 0);
        });
        const primeiraInsuficiencia = insuficientes[0];
        if (primeiraInsuficiencia) {
          const [tipoId, quantidade] = primeiraInsuficiencia;
          const disponivel = get().estoqueQtd[tipoId] || 0;
          return {
            ok: false,
            msg: `Estoque insuficiente: ${tipoById(tipoId)?.nome ?? tipoId}. Pedido: ${quantidade}; disponível: ${disponivel}.`,
          };
        }
        const est = { ...get().estoqueQtd };
        for (const [t, q] of Object.entries(op.qtdSaida)) est[t] = (est[t] || 0) - q;
        const n = get().equipamentos.filter(
          (e) => e.operacaoId === opId && e.status === "separado",
        ).length;
        set((s) => ({
          estoqueQtd: est,
          equipamentos: s.equipamentos.map((e) =>
            e.operacaoId === opId && e.status === "separado" ? { ...e, status: "campo" } : e,
          ),
          operacoes: s.operacoes.map((o) =>
            o.id === opId ? { ...o, status: "campo", retornados: [] } : o,
          ),
        }));
        get().log(
          "saida",
          `SAÍDA para ${op.local}: ${n} equipamentos com patrimônio + ${Object.values(op.qtdSaida).reduce((a, b) => a + b, 0)} itens avulsos`,
          { operacaoId: opId },
        );
        return { ok: true, msg: `Saída de ${op.local} registrada.` };
      },

      conferirRetorno: (opId, patrimonio) => {
        const pat = patrimonio.trim().toUpperCase();
        const eq = get().equipamentos.find((x) => x.patrimonio === pat);
        if (!eq) return { ok: false, msg: `${pat} não existe no cadastro.` };
        if (eq.operacaoId !== opId) return { ok: false, msg: `${pat} não saiu nesta operação!` };
        const op = get().operacoes.find((o) => o.id === opId)!;
        if (op.retornados.includes(eq.id)) return { ok: false, msg: `${pat} já foi conferido.` };
        set((s) => ({
          operacoes: s.operacoes.map((o) =>
            o.id === opId ? { ...o, retornados: [...o.retornados, eq.id] } : o,
          ),
        }));
        return { ok: true, msg: `${tipoById(eq.tipoId)?.nome} ${pat} voltou ✓` };
      },

      finalizarRetorno: (opId) => {
        const op = get().operacoes.find((o) => o.id === opId);
        if (!op) return { ok: false, msg: "Mutirão não encontrado." };
        if (op.status !== "campo")
          return {
            ok: false,
            msg: "O retorno deste mutirão já foi finalizado ou a saída ainda não foi registrada.",
          };
        const est = { ...get().estoqueQtd };
        for (const [t, q] of Object.entries(op.qtdRetorno)) est[t] = (est[t] || 0) + q;
        const faltando = get().equipamentos.filter(
          (e) => e.operacaoId === opId && !op.retornados.includes(e.id),
        );
        const danif = new Set(
          (op.ocorrencias || [])
            .filter((o) => o.tipo === "danificado" && o.patrimonio)
            .map((o) => o.patrimonio!.toUpperCase()),
        );
        const autos: Ocorrencia[] = [
          ...faltando.map((f) => ({
            id: uid(),
            ts: new Date().toISOString(),
            tipo: "faltante" as const,
            tipoId: f.tipoId,
            patrimonio: f.patrimonio,
            qtd: 1,
            obs: "Não conferido no retorno",
            auto: true,
          })),
          ...Object.entries(op.qtdSaida)
            .filter(([t, q]) => (op.qtdRetorno[t] || 0) < q)
            .map(([t, q]) => ({
              id: uid(),
              ts: new Date().toISOString(),
              tipo: "faltante" as const,
              tipoId: t,
              qtd: q - (op.qtdRetorno[t] || 0),
              obs: "Quantidade menor no retorno",
              auto: true,
            })),
          ...Object.entries(op.qtdRetorno)
            .filter(([t, r]) => r > (op.qtdSaida[t] || 0))
            .map(([t, r]) => ({
              id: uid(),
              ts: new Date().toISOString(),
              tipo: "excedente" as const,
              tipoId: t,
              qtd: r - (op.qtdSaida[t] || 0),
              obs: "Voltou mais do que saiu",
              auto: true,
            })),
        ];
        set((s) => ({
          estoqueQtd: est,
          equipamentos: s.equipamentos.map((e) => {
            if (e.operacaoId !== opId) return e;
            if (op.retornados.includes(e.id))
              return desvincularEquipamento(
                e,
                danif.has(e.patrimonio) ? "manutencao" : "disponivel",
              );
            return desvincularEquipamento(
              e,
              "manutencao",
              `${e.obs ? e.obs + " | " : ""}NÃO RETORNOU de ${op.local}`,
            );
          }),
          operacoes: s.operacoes.map((o) =>
            o.id === opId
              ? {
                  ...o,
                  status: "retornada",
                  ocorrencias: [...(o.ocorrencias || []).filter((x) => !x.auto), ...autos],
                }
              : o,
          ),
        }));
        get().log(
          "retorno",
          `RETORNO de ${op.local}: ${op.retornados.length} equipamentos conferidos`,
          { operacaoId: opId },
        );
        for (const f of faltando)
          get().log(
            "falta",
            `FALTA: ${tipoById(f.tipoId)?.nome} ${f.patrimonio} não voltou de ${op.local}`,
            { operacaoId: opId, equipamentoId: f.id },
          );
        for (const [t, q] of Object.entries(op.qtdSaida)) {
          const r = op.qtdRetorno[t] || 0;
          if (r < q)
            get().log(
              "falta",
              `FALTA: ${q - r}× ${tipoById(t)?.nome} não voltaram de ${op.local}`,
              { operacaoId: opId },
            );
        }
        return { ok: true, msg: `Retorno de ${op.local} finalizado.` };
      },

      addOcorrencia: (opId, o) => {
        const op = get().operacoes.find((x) => x.id === opId)!;
        const nova: Ocorrencia = { ...o, id: uid(), ts: new Date().toISOString() };
        set((s) => ({
          operacoes: s.operacoes.map((x) =>
            x.id === opId ? { ...x, ocorrencias: [...(x.ocorrencias || []), nova] } : x,
          ),
        }));
        if (o.tipo === "danificado" && o.patrimonio) {
          const eq = get().equipamentos.find((e) => e.patrimonio === o.patrimonio!.toUpperCase());
          if (eq)
            set((s) => ({
              equipamentos: s.equipamentos.map((e) =>
                e.id === eq.id
                  ? {
                      ...e,
                      obs: `${e.obs ? e.obs + " | " : ""}DANIFICADO em ${op.local}: ${o.obs}`,
                    }
                  : e,
              ),
            }));
        }
        const nome = o.patrimonio || (o.tipoId ? tipoById(o.tipoId)?.nome : "") || "";
        get().log(
          "falta",
          `${o.tipo.toUpperCase()}: ${o.qtd}× ${nome} — ${op.local}${o.obs ? ` (${o.obs})` : ""}`,
          { operacaoId: opId },
        );
      },
      removeOcorrencia: (opId, id) =>
        set((s) => ({
          operacoes: s.operacoes.map((x) =>
            x.id === opId
              ? { ...x, ocorrencias: (x.ocorrencias || []).filter((o) => o.id !== id) }
              : x,
          ),
        })),

      updateModelo: (m) => set((s) => ({ modelos: s.modelos.map((x) => (x.id === m.id ? m : x)) })),
      resetCronograma: () => set((s) => ({ operacoes: semearOperacoes(s.modelos) })),
    }),
    {
      name: "maissaude-ti-v1",
      version: 2,
      migrate: (persistedState, version) => {
        const state = persistedState as Partial<Estado>;
        if (version >= 2) return state as Estado;
        return {
          ...state,
          ...(state.modelos
            ? {
                modelos: state.modelos.map((modelo) => ({
                  ...modelo,
                  setores: consolidarItensDuplicados(modelo.setores),
                })),
              }
            : {}),
          ...(state.operacoes
            ? {
                operacoes: state.operacoes.map((operacao) => ({
                  ...operacao,
                  setores: consolidarItensDuplicados(operacao.setores),
                })),
              }
            : {}),
        } as Estado;
      },
    },
  ),
);

export const STATUS_EQUIP: Record<StatusEquip, { label: string; cls: string }> = {
  disponivel: { label: "Disponível", cls: "bg-ok text-ok-foreground" },
  separado: { label: "Separado", cls: "bg-warn text-warn-foreground" },
  campo: { label: "Em campo", cls: "bg-info text-info-foreground" },
  manutencao: { label: "Manutenção", cls: "bg-danger text-danger-foreground" },
  baixa: { label: "Baixa", cls: "bg-muted text-muted-foreground" },
};

export const STATUS_OP: Record<StatusOp, { label: string; cls: string; passo: number }> = {
  planejada: { label: "A separar", cls: "bg-muted text-foreground", passo: 0 },
  separando: { label: "Separando", cls: "bg-warn text-warn-foreground", passo: 1 },
  campo: { label: "Em campo", cls: "bg-info text-info-foreground", passo: 2 },
  retornada: { label: "Retornou", cls: "bg-ok text-ok-foreground", passo: 3 },
};

export const fmtData = (d: string) => {
  const [y, m, dd] = d.split("-").map(Number);
  if (!y || !m || !dd) return d;
  return new Date(y, m - 1, dd).toLocaleDateString("pt-BR", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
  });
};
export const hojeISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
