// Catálogo de tipos de equipamento, kits-modelo e cronograma de exemplo.
// DADOS FICTÍCIOS DE DEMONSTRAÇÃO: localidades, datas, serviços e quantidades não representam nenhuma operação real.

export type Controle = "patrimonio" | "quantidade" | "servico";

export interface TipoEquip {
  id: string;
  nome: string;
  controle: Controle; // patrimonio = cada unidade é cadastrada; quantidade = conta no estoque; servico = só checklist
  grupo:
    | "Computadores"
    | "Impressão"
    | "Imagem & Som"
    | "Rede & Energia"
    | "Acessórios"
    | "Insumos"
    | "Serviços";
}

export const TIPOS: TipoEquip[] = [
  { id: "notebook", nome: "Notebook", controle: "patrimonio", grupo: "Computadores" },
  { id: "vivobox", nome: "Vivobox (mini PC)", controle: "patrimonio", grupo: "Computadores" },
  { id: "tablet", nome: "Tablet", controle: "patrimonio", grupo: "Computadores" },
  { id: "zebra", nome: "Impressora Zebra ZD220", controle: "patrimonio", grupo: "Impressão" },
  { id: "laser", nome: "Impressora Laser", controle: "patrimonio", grupo: "Impressão" },
  {
    id: "multifuncional",
    nome: "Multifuncional Laser",
    controle: "patrimonio",
    grupo: "Impressão",
  },
  { id: "termica", nome: "Impressora Térmica", controle: "patrimonio", grupo: "Impressão" },
  { id: "totem", nome: "Totem de senha (térmica)", controle: "patrimonio", grupo: "Impressão" },
  { id: "scanner", nome: "Scanner (digitalizadora)", controle: "patrimonio", grupo: "Impressão" },
  { id: "tv", nome: 'TV 43" a 50"', controle: "patrimonio", grupo: "Imagem & Som" },
  { id: "caixa_som", nome: "Caixa de som", controle: "patrimonio", grupo: "Imagem & Som" },
  { id: "router", nome: "Roteador sem fio", controle: "patrimonio", grupo: "Rede & Energia" },
  {
    id: "transformador",
    nome: "Transformador 220v→110v",
    controle: "patrimonio",
    grupo: "Rede & Energia",
  },
  { id: "extensao", nome: "Extensão de energia", controle: "quantidade", grupo: "Rede & Energia" },
  { id: "extensao5", nome: "Extensão 5 tomadas", controle: "quantidade", grupo: "Rede & Energia" },
  { id: "cabo_rede", nome: "Cabo de rede 15m", controle: "quantidade", grupo: "Rede & Energia" },
  {
    id: "bateria_totem",
    nome: "Bateria para Totem",
    controle: "quantidade",
    grupo: "Rede & Energia",
  },
  { id: "mouse", nome: "Mouse", controle: "quantidade", grupo: "Acessórios" },
  { id: "mousepad", nome: "Mousepad", controle: "quantidade", grupo: "Acessórios" },
  { id: "suporte_tv", nome: "Suporte de TV", controle: "quantidade", grupo: "Acessórios" },
  {
    id: "suporte_som",
    nome: "Suporte de caixa de som",
    controle: "quantidade",
    grupo: "Acessórios",
  },
  { id: "hub_usb", nome: "Adaptador hub USB", controle: "quantidade", grupo: "Acessórios" },
  { id: "kit_ferramenta", nome: "Kit ferramentas TI", controle: "quantidade", grupo: "Acessórios" },
  { id: "etiqueta", nome: "Etiqueta Zebra 100x40", controle: "quantidade", grupo: "Insumos" },
  { id: "pulseira", nome: "Pulseira Zebra 279x25", controle: "quantidade", grupo: "Insumos" },
  { id: "ribbon", nome: "Bobina Ribbon", controle: "quantidade", grupo: "Insumos" },
  { id: "toner_laser", nome: "Toner impressora laser", controle: "quantidade", grupo: "Insumos" },
  { id: "toner_mf", nome: "Toner multifuncional", controle: "quantidade", grupo: "Insumos" },
  {
    id: "bobina_senha",
    nome: "Bobina de senha (térmica)",
    controle: "quantidade",
    grupo: "Insumos",
  },
  { id: "link", nome: "Link de internet", controle: "servico", grupo: "Serviços" },
];

export const tipoById = (id: string) => TIPOS.find((t) => t.id === id);

export interface ItemKit {
  tipoId: string;
  qtd: number; // quantidade para a equipe-base
  escala: boolean; // true = acompanha nº de funcionários do setor
  adicionalFixo?: number;
}
export interface Setor {
  id: string;
  nome: string;
  equipeBase: number;
  itens: ItemKit[];
}
export interface Modelo {
  id: string;
  nome: string;
  cor: "cirurgia" | "oftalmo" | "triagem" | "surpresa";
  setores: Setor[];
}

export function consolidarItensDuplicados<T extends Setor>(setores: T[]): T[] {
  return setores.map((setor) => {
    const porTipo = new Map<string, ItemKit>();
    for (const item of setor.itens) {
      const existente = porTipo.get(item.tipoId);
      if (!existente) {
        porTipo.set(item.tipoId, item);
        continue;
      }

      const quantidadeEscalonada =
        (existente.escala ? existente.qtd : 0) + (item.escala ? item.qtd : 0);
      const quantidadeFixa =
        (existente.escala ? (existente.adicionalFixo ?? 0) : existente.qtd) +
        (item.escala ? (item.adicionalFixo ?? 0) : item.qtd);
      porTipo.set(
        item.tipoId,
        quantidadeEscalonada > 0
          ? {
              tipoId: item.tipoId,
              qtd: quantidadeEscalonada,
              escala: true,
              ...(quantidadeFixa > 0 ? { adicionalFixo: quantidadeFixa } : {}),
            }
          : { tipoId: item.tipoId, qtd: quantidadeFixa, escala: false },
      );
    }
    return { ...setor, itens: [...porTipo.values()] };
  });
}

const e = (tipoId: string, qtd: number, adicionalFixo = 0): ItemKit => ({
  tipoId,
  qtd,
  escala: true,
  ...(adicionalFixo ? { adicionalFixo } : {}),
});
const f = (tipoId: string, qtd: number): ItemKit => ({ tipoId, qtd, escala: false });

export const MODELOS_PADRAO: Modelo[] = [
  {
    id: "cirurgia",
    nome: "Cirurgias Eletivas",
    cor: "cirurgia",
    setores: [
      {
        id: "recepcao",
        nome: "Recepção",
        equipeBase: 2,
        itens: [
          e("notebook", 2),
          e("mouse", 2),
          e("mousepad", 2),
          f("zebra", 2),
          e("extensao5", 2),
          f("laser", 1),
          f("transformador", 1),
          f("router", 1),
        ],
      },
      {
        id: "ponto",
        nome: "Registro de ponto · Centro cirúrgico",
        equipeBase: 1,
        itens: [f("tablet", 1)],
      },
      {
        id: "consultorio",
        nome: "Consultório médico (Revisão)",
        equipeBase: 1,
        itens: [e("notebook", 1), e("mouse", 1), e("mousepad", 1), e("extensao", 1)],
      },
      {
        id: "almox",
        nome: "Almoxarifado / Farmácia",
        equipeBase: 1,
        itens: [
          e("notebook", 1),
          e("mouse", 1),
          e("mousepad", 1),
          f("laser", 1),
          f("transformador", 1),
        ],
      },
      {
        id: "faturamento",
        nome: "Faturamento",
        equipeBase: 1,
        itens: [
          e("notebook", 1),
          e("mouse", 1),
          e("mousepad", 1),
          f("laser", 1),
          f("extensao", 1),
          f("transformador", 1),
          f("scanner", 1),
        ],
      },
      {
        id: "backup",
        nome: "Backup (reserva)",
        equipeBase: 2,
        itens: [
          f("notebook", 2),
          f("mouse", 2),
          f("mousepad", 2),
          f("router", 1),
          f("extensao", 1),
          f("laser", 1),
          f("zebra", 1),
          f("vivobox", 2),
          f("transformador", 1),
        ],
      },
      {
        id: "ti",
        nome: "Conectividade & TI",
        equipeBase: 1,
        itens: [
          f("router", 1),
          f("kit_ferramenta", 1),
          f("tablet", 1),
          f("link", 1),
          f("cabo_rede", 3),
        ],
      },
      {
        id: "insumos",
        nome: "Insumos",
        equipeBase: 1,
        itens: [
          f("etiqueta", 20),
          f("ribbon", 28),
          f("pulseira", 8),
          f("toner_laser", 2),
          f("toner_mf", 2),
        ],
      },
    ],
  },
  {
    id: "oftalmo",
    nome: "Oftalmologia",
    cor: "oftalmo",
    setores: [
      {
        id: "senha",
        nome: "Painel de senha",
        equipeBase: 1,
        itens: [
          f("tv", 2),
          f("suporte_tv", 2),
          f("caixa_som", 2),
          f("suporte_som", 2),
          f("totem", 1),
          f("extensao", 2),
          f("bateria_totem", 1),
        ],
      },
      {
        id: "recepcao",
        nome: "Recepção",
        equipeBase: 6,
        itens: [
          e("notebook", 8),
          e("mouse", 8),
          e("mousepad", 8),
          e("zebra", 8),
          e("extensao5", 3),
        ],
      },
      { id: "preexame", nome: "Pré-exame", equipeBase: 1, itens: [f("tablet", 1)] },
      {
        id: "consultorio",
        nome: "Consultório médico",
        equipeBase: 2,
        itens: [
          e("notebook", 2),
          e("mouse", 2),
          e("mousepad", 2),
          f("tv", 1),
          f("suporte_tv", 1),
          f("extensao", 1),
        ],
      },
      {
        id: "almox",
        nome: "Almoxarifado",
        equipeBase: 1,
        itens: [e("notebook", 1), e("mouse", 1), e("mousepad", 1)],
      },
      {
        id: "marcacao",
        nome: "Marcação (agendamento)",
        equipeBase: 4,
        itens: [
          e("notebook", 3),
          e("mouse", 3),
          e("mousepad", 3),
          f("multifuncional", 1),
          f("scanner", 1),
          e("extensao", 2),
          f("transformador", 1),
          e("zebra", 3),
        ],
      },
      {
        id: "faturamento",
        nome: "Faturamento",
        equipeBase: 1,
        itens: [
          e("notebook", 1),
          e("mouse", 1),
          e("mousepad", 1),
          f("laser", 1),
          f("extensao", 1),
          f("transformador", 1),
        ],
      },
      {
        id: "backup",
        nome: "Backup (reserva)",
        equipeBase: 4,
        itens: [
          f("notebook", 3),
          f("mouse", 3),
          f("mousepad", 3),
          f("router", 1),
          f("extensao", 1),
          f("laser", 1),
          f("zebra", 2),
          f("termica", 1),
          f("vivobox", 3),
          f("tv", 1),
          f("tablet", 1),
          f("transformador", 1),
        ],
      },
      {
        id: "ti",
        nome: "Conectividade & TI",
        equipeBase: 1,
        itens: [
          f("router", 2),
          f("kit_ferramenta", 1),
          f("tablet", 1),
          f("link", 1),
          f("cabo_rede", 3),
        ],
      },
      {
        id: "insumos",
        nome: "Insumos",
        equipeBase: 1,
        itens: [
          f("etiqueta", 20),
          f("ribbon", 20),
          f("toner_laser", 2),
          f("toner_mf", 2),
          f("bobina_senha", 6),
        ],
      },
    ],
  },
  {
    id: "triagem",
    nome: "Triagem / Exames (Carreta)",
    cor: "triagem",
    setores: [
      {
        id: "senha",
        nome: "Painel de senha",
        equipeBase: 1,
        itens: [
          f("tv", 2),
          f("suporte_tv", 2),
          f("caixa_som", 2),
          f("suporte_som", 2),
          f("totem", 1),
          f("extensao", 2),
          f("bateria_totem", 1),
        ],
      },
      {
        id: "recepcao",
        nome: "Recepção (cadastro)",
        equipeBase: 6,
        itens: [
          e("notebook", 8),
          e("mouse", 8),
          e("mousepad", 8),
          e("zebra", 4),
          e("extensao5", 3),
        ],
      },
      {
        id: "usg",
        nome: "Consultório USG",
        equipeBase: 6,
        itens: [
          e("notebook", 6),
          e("mouse", 6),
          e("mousepad", 6),
          f("tv", 1),
          f("suporte_tv", 1),
          e("extensao", 3, 1),
          e("laser", 3),
          e("transformador", 3),
        ],
      },
      {
        id: "ecg",
        nome: "Consultório ECG",
        equipeBase: 2,
        itens: [
          e("notebook", 2),
          e("mouse", 2),
          e("mousepad", 2),
          e("laser", 2),
          e("hub_usb", 2),
          e("transformador", 2),
        ],
      },
      {
        id: "almox",
        nome: "Almoxarifado",
        equipeBase: 1,
        itens: [e("notebook", 1), e("mouse", 1), e("mousepad", 1)],
      },
      {
        id: "faturamento",
        nome: "Faturamento",
        equipeBase: 2,
        itens: [
          e("notebook", 2),
          e("mouse", 2),
          e("mousepad", 2),
          f("laser", 1),
          f("extensao", 1),
          f("transformador", 1),
          f("scanner", 1),
        ],
      },
      {
        id: "backup",
        nome: "Backup (reserva)",
        equipeBase: 4,
        itens: [
          f("notebook", 3),
          f("mouse", 3),
          f("mousepad", 3),
          f("router", 1),
          f("extensao", 1),
          f("laser", 1),
          f("zebra", 2),
          f("termica", 1),
          f("vivobox", 3),
          f("tv", 1),
          f("tablet", 1),
          f("transformador", 1),
        ],
      },
      {
        id: "ti",
        nome: "Conectividade & TI",
        equipeBase: 1,
        itens: [
          f("router", 2),
          f("kit_ferramenta", 1),
          f("tablet", 1),
          f("link", 1),
          f("cabo_rede", 3),
        ],
      },
      {
        id: "insumos",
        nome: "Insumos",
        equipeBase: 1,
        itens: [f("etiqueta", 18), f("toner_laser", 12), f("toner_mf", 2), f("ribbon", 16)],
      },
    ],
  },
];

// Cronograma de exemplo (dados fictícios) — [dia, localidade, serviços]
export const CRONOGRAMA_OUT_2026: [number, string, string][] = [
  [1, "Cidade Alfa", "Cirurgias eletivas"],
  [1, "Cidade Beta", "Cirurgias eletivas"],
  [2, "Cidade Alfa", "Cirurgias eletivas / Revisão"],
  [2, "Cidade Beta", "Cirurgias eletivas / Revisão"],
  [3, "Cidade Alfa", "Cirurgia geral"],
  [5, "Cidade Alfa", "Cirurgias eletivas"],
  [5, "Cidade Beta", "Cirurgias eletivas"],
  [6, "Cidade Alfa", "Cirurgias eletivas / Revisão"],
  [6, "Cidade Beta", "Cirurgias eletivas / Revisão"],
  [7, "Cidade Alfa", "Cirurgia geral"],
  [7, "Cidade Gama", "Triagem Oftalmo"],
  [8, "Cidade Alfa", "Cirurgias eletivas"],
  [8, "Cidade Gama", "Cirurgia Oftalmo"],
  [8, "Cidade Épsilon", "Triagem Oftalmo"],
  [9, "Cidade Alfa", "Cirurgias eletivas / Revisão"],
  [9, "Cidade Gama", "Revisão Oftalmo"],
  [9, "Cidade Épsilon", "Cirurgia Oftalmo"],
  [10, "Cidade Gama", "Triagem Oftalmo"],
  [10, "Cidade Épsilon", "Revisão Oftalmo"],
  [11, "Cidade Gama", "Cirurgia Oftalmo"],
  [12, "Cidade Beta", "Triagem / USG / ECG"],
  [13, "Cidade Alfa", "Triagem / USG / ECG"],
  [13, "Cidade Beta", "Consultas / Laboratório"],
  [14, "Cidade Alfa", "Consultas / Laboratório"],
  [14, "Cidade Beta", "Consulta / USG Doppler"],
  [15, "Cidade Alfa", "Consulta / USG Doppler"],
  [15, "Cidade Beta", "Triagem / USG / ECG"],
  [15, "Cidade Zeta", "Cirurgias eletivas"],
  [16, "Cidade Alfa", "Triagem / USG / ECG"],
  [16, "Cidade Beta", "Consultas / Laboratório"],
  [16, "Cidade Zeta", "Cirurgias eletivas / Revisão"],
  [17, "Cidade Alfa", "Consultas / Laboratório"],
  [17, "Cidade Zeta", "Cirurgia geral"],
  [18, "Cidade Zeta", "Cirurgias eletivas"],
  [19, "Cidade Alfa", "Cirurgias eletivas"],
  [19, "Cidade Delta", "Triagem / USG / ECG"],
  [20, "Cidade Alfa", "Cirurgias eletivas / Revisão"],
  [20, "Cidade Beta", "Cirurgias eletivas"],
  [20, "Cidade Delta", "Consultas / Laboratório"],
  [21, "Cidade Alfa", "Cirurgia geral"],
  [21, "Cidade Beta", "Cirurgias eletivas / Revisão"],
  [21, "Cidade Gama", "Triagem Oftalmo"],
  [21, "Cidade Delta", "Consulta / USG Doppler"],
  [22, "Cidade Alfa", "Cirurgias eletivas"],
  [22, "Cidade Beta", "Cirurgia geral"],
  [22, "Cidade Gama", "Cirurgia Oftalmo"],
  [22, "Cidade Delta", "Triagem / USG / ECG"],
  [23, "Cidade Alfa", "Cirurgias eletivas / Revisão"],
  [23, "Cidade Beta", "Cirurgias eletivas"],
  [23, "Cidade Delta", "Consultas / Laboratório"],
  [24, "Cidade Alfa", "Cirurgia geral"],
  [24, "Cidade Delta", "Consulta / USG Doppler"],
  [25, "Cidade Épsilon", "Triagem Oftalmo"],
  [26, "Cidade Alfa", "Cirurgias eletivas"],
  [26, "Cidade Delta", "Triagem / USG / ECG"],
  [26, "Cidade Épsilon", "Cirurgia Oftalmo"],
  [27, "Cidade Alfa", "Cirurgias eletivas / Revisão"],
  [27, "Cidade Beta", "Triagem / USG / ECG"],
  [27, "Cidade Delta", "Consultas / Laboratório"],
  [27, "Cidade Épsilon", "Revisão Oftalmo"],
  [28, "Cidade Alfa", "Cirurgia geral"],
  [28, "Cidade Beta", "Consultas / Laboratório"],
  [28, "Cidade Delta", "Consulta / USG Doppler"],
  [28, "Cidade Épsilon", "Triagem Oftalmo"],
  [29, "Cidade Alfa", "Cirurgias eletivas"],
  [29, "Cidade Beta", "Consulta / USG Doppler"],
  [29, "Cidade Delta", "Triagem / USG / ECG"],
  [30, "Cidade Alfa", "Cirurgias eletivas / Revisão"],
  [30, "Cidade Beta", "Triagem / USG / ECG"],
  [30, "Cidade Delta", "Consultas / Laboratório"],
  [31, "Cidade Alfa", "Cirurgia geral"],
  [31, "Cidade Delta", "Consulta / USG Doppler"],
];

export const DATAS_ESPECIAIS: Record<string, string> = {
  "2026-10-04": "Eleições (1º turno)",
  "2026-10-12": "Feriado nacional",
  "2026-10-25": "Eleições (2º turno)",
};

export function detectarModelo(servicos: string): string {
  const s = servicos.toLowerCase();
  const oft = (s.match(/oftalmo/g) || []).length;
  const tri = (s.match(/usg|ecg|triagem|lab|consulta|doppler/g) || []).length;
  const cir = (s.match(/cirurg|cir\.|eletiv|revis|rev\b|mama|varizes|mamopl|otorrino/g) || [])
    .length;
  if (oft >= tri && oft >= cir && oft > 0) return "oftalmo";
  if (tri > cir) return "triagem";
  return "cirurgia";
}

export const iso = (d: number) => `2026-10-${String(d).padStart(2, "0")}`;
