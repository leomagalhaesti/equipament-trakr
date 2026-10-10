import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { MODELOS_PADRAO, consolidarItensDuplicados } from "@/lib/catalog";
import { qtdItem, useStore, type Operacao } from "@/lib/store";

const makeOperation = (): Operacao => ({
  id: "operation-1",
  local: "Unidade de teste",
  dias: [{ data: "2026-10-02", servicos: "Triagem" }],
  modeloId: "triagem",
  setores: [],
  status: "separando",
  surpresa: false,
  qtdSaida: { mouse: 2 },
  qtdRetorno: {},
  servicosOk: {},
  retornados: [],
  responsavel: "",
  obs: "",
});

function resetStore(mouseStock: number) {
  localStorage.clear();
  useStore.setState({
    equipamentos: [],
    estoqueQtd: { mouse: mouseStock },
    operacoes: [makeOperation()],
    modelos: structuredClone(MODELOS_PADRAO),
    movimentos: [],
  });
}

describe("equipment operation stock safety", () => {
  beforeEach(() => resetStore(1));

  afterEach(() => {
    localStorage.clear();
  });

  it("blocks dispatch when the requested quantity exceeds available stock", () => {
    const result = useStore.getState().despachar("operation-1");

    expect(result).toMatchObject({ ok: false });
    expect(useStore.getState().estoqueQtd["mouse"]).toBe(1);
    expect(useStore.getState().operacoes[0]?.status).toBe("separando");
  });

  it("requires a reason for manual stock withdrawals", () => {
    const result = useStore.getState().ajustarQtd("mouse", -1);

    expect(result).toMatchObject({ ok: false });
    expect(useStore.getState().estoqueQtd["mouse"]).toBe(1);
    expect(useStore.getState().movimentos).toHaveLength(0);
  });

  it("does not debit stock twice for a repeated dispatch", () => {
    resetStore(2);
    const first = useStore.getState().despachar("operation-1");
    const second = useStore.getState().despachar("operation-1");

    expect(first).toMatchObject({ ok: true });
    expect(second).toMatchObject({ ok: false });
    expect(useStore.getState().estoqueQtd["mouse"]).toBe(0);
    expect(
      useStore.getState().movimentos.filter((movement) => movement.tipo === "saida"),
    ).toHaveLength(1);
  });

  it("does not add returned quantities twice", () => {
    resetStore(2);
    useStore.getState().despachar("operation-1");
    useStore.getState().updateOperacao("operation-1", { qtdRetorno: { mouse: 2 } });

    const first = useStore.getState().finalizarRetorno("operation-1");
    const second = useStore.getState().finalizarRetorno("operation-1");

    expect(first).toMatchObject({ ok: true });
    expect(second).toMatchObject({ ok: false });
    expect(useStore.getState().estoqueQtd["mouse"]).toBe(2);
    expect(
      useStore.getState().movimentos.filter((movement) => movement.tipo === "retorno"),
    ).toHaveLength(1);
  });
});

describe("employee-scaled equipment scope", () => {
  it("merges duplicate fixed and scaled lines without losing either quantity", () => {
    const [setor] = consolidarItensDuplicados([
      {
        id: "usg",
        nome: "Consultório USG",
        equipeBase: 6,
        itens: [
          { tipoId: "extensao", qtd: 1, escala: false },
          { tipoId: "extensao", qtd: 3, escala: true },
        ],
      },
    ]);

    expect(setor?.itens).toEqual([{ tipoId: "extensao", qtd: 3, escala: true, adicionalFixo: 1 }]);
  });

  it("combines fixed and team-scaled extensions without duplicate item IDs", () => {
    const modelo = MODELOS_PADRAO.find((item) => item.id === "triagem");
    const setor = modelo?.setores.find((item) => item.id === "usg");
    expect(setor).toBeDefined();
    if (!setor) return;

    expect(new Set(setor.itens.map((item) => item.tipoId)).size).toBe(setor.itens.length);
    expect(qtdItem({ ...setor, equipe: 6, ajustes: {} }, "extensao")).toBe(4);
    expect(qtdItem({ ...setor, equipe: 12, ajustes: {} }, "extensao")).toBe(7);
  });
});
