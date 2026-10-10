import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { TIPOS, tipoById } from "./catalog";
import {
  demanda,
  fmtData,
  STATUS_EQUIP,
  STATUS_OP,
  type Equipamento,
  type Movimento,
  type Operacao,
} from "./store";

const VERDE: [number, number, number] = [46, 140, 80];
const ROSA: [number, number, number] = [222, 80, 140];

function cabecalho(doc: jsPDF, titulo: string, sub: string) {
  doc.setFillColor(...VERDE);
  doc.rect(0, 0, 210, 26, "F");
  doc.setFillColor(...ROSA);
  doc.rect(0, 26, 210, 2, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("CONTROLE T.I. · Centro de Distribuição", 12, 12);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`${titulo} — ${sub}`, 12, 20);
  doc.setTextColor(30, 30, 30);
}

function rodape(doc: jsPDF) {
  const n = doc.getNumberOfPages();
  for (let i = 1; i <= n; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(120);
    doc.text(`Gerado em ${new Date().toLocaleString("pt-BR")} · Página ${i}/${n}`, 12, 290);
  }
}

const y = (doc: jsPDF) =>
  ((doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 34) + 8;

function periodoOperacao(op: Operacao) {
  const inicio = op.dias[0]?.data;
  const fim = op.dias[op.dias.length - 1]?.data;
  if (!inicio || !fim) return "Período não informado";
  return `${fmtData(inicio)} → ${fmtData(fim)}`;
}

function secao(doc: jsPDF, texto: string, at: number) {
  if (at > 270) {
    doc.addPage();
    at = 20;
  }
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(...VERDE);
  doc.text(texto, 12, at);
  doc.setTextColor(30, 30, 30);
  return at + 3;
}

export function pdfDoDia(
  data: string,
  ops: Operacao[],
  equip: Equipamento[],
  movs: Movimento[],
  estoqueQtd: Record<string, number>,
) {
  const doc = new jsPDF();
  cabecalho(doc, "Relatório diário", fmtData(data));

  const movDia = movs.filter((m) => m.ts.slice(0, 10) === data).reverse();
  let at = secao(doc, `1. Movimentações do dia (${movDia.length})`, 36);
  autoTable(doc, {
    startY: at,
    head: [["Hora", "Tipo", "Descrição"]],
    body: movDia.length
      ? movDia.map((m) => [
          new Date(m.ts).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
          m.tipo.toUpperCase(),
          m.texto,
        ])
      : [["—", "—", "Nenhuma movimentação registrada"]],
    headStyles: { fillColor: VERDE },
    styles: { fontSize: 8 },
    columnStyles: { 0: { cellWidth: 14 }, 1: { cellWidth: 24 } },
  });

  const ativas = ops.filter(
    (o) => o.dias.some((d) => d.data === data) || o.status === "campo" || o.status === "separando",
  );
  at = secao(doc, `2. Mutirões ativos / do dia (${ativas.length})`, y(doc));
  autoTable(doc, {
    startY: at,
    head: [["Local", "Período", "Status", "Equip. c/ patrimônio", "Retornados"]],
    body: ativas.map((o) => {
      const eqs = equip.filter((e) => e.operacaoId === o.id);
      return [
        o.local + (o.surpresa ? " (SURPRESA)" : ""),
        periodoOperacao(o),
        STATUS_OP[o.status].label,
        String(eqs.length),
        o.status === "campo" ? `${o.retornados.length}/${eqs.length}` : "—",
      ];
    }),
    headStyles: { fillColor: VERDE },
    styles: { fontSize: 8 },
  });

  const fora = equip.filter((e) => e.status === "campo" || e.status === "separado");
  at = secao(doc, `3. Equipamentos fora do CD (${fora.length})`, y(doc));
  autoTable(doc, {
    startY: at,
    head: [["Patrimônio", "Tipo", "Modelo", "Origem", "Status", "Destino"]],
    body: fora.map((e) => [
      e.patrimonio,
      tipoById(e.tipoId)?.nome ?? "",
      e.modelo,
      e.origem === "alugado" ? "ALUGADO" : "Patrimonial",
      STATUS_EQUIP[e.status].label,
      ops.find((o) => o.id === e.operacaoId)?.local ?? "",
    ]),
    headStyles: { fillColor: VERDE },
    styles: { fontSize: 8 },
  });

  at = secao(doc, "4. Saldo do estoque no CD", y(doc));
  autoTable(doc, {
    startY: at,
    head: [["Item", "Disponível", "Em campo", "Manutenção", "Alugados (total)"]],
    body: TIPOS.filter((t) => t.controle !== "servico").map((t) => {
      if (t.controle === "quantidade")
        return [t.nome, String(estoqueQtd[t.id] || 0), "—", "—", "—"];
      const l = equip.filter((e) => e.tipoId === t.id);
      return [
        t.nome,
        String(l.filter((e) => e.status === "disponivel").length),
        String(l.filter((e) => e.status === "campo" || e.status === "separado").length),
        String(l.filter((e) => e.status === "manutencao").length),
        String(l.filter((e) => e.origem === "alugado").length),
      ];
    }),
    headStyles: { fillColor: VERDE },
    styles: { fontSize: 8 },
  });

  assinaturas(doc);
  rodape(doc);
  doc.save(`ControleTI_${data}.pdf`);
}

function assinaturas(doc: jsPDF) {
  let at = y(doc) + 10;
  if (at > 260) {
    doc.addPage();
    at = 30;
  }
  doc.setDrawColor(150);
  doc.line(15, at, 95, at);
  doc.line(115, at, 195, at);
  doc.setFontSize(9);
  doc.text("Responsável TI (CD)", 15, at + 5);
  doc.text("Recebido por / Conferente", 115, at + 5);
}

export function pdfRomaneio(op: Operacao, equip: Equipamento[], tipo: "saida" | "retorno") {
  const doc = new jsPDF();
  cabecalho(
    doc,
    tipo === "saida" ? "Romaneio de SAÍDA" : "Conferência de RETORNO",
    `${op.local} · ${periodoOperacao(op)}`,
  );
  doc.setFontSize(9);
  doc.text(
    `Responsável: ${op.responsavel || "________________"}   ·   Serviços: ${[...new Set(op.dias.map((d) => d.servicos))].join(" | ").slice(0, 150)}`,
    12,
    34,
  );

  const eqs = equip.filter((e) => e.operacaoId === op.id);
  autoTable(doc, {
    startY: 40,
    head: [
      [
        "#",
        "Patrimônio",
        "Tipo",
        "Modelo",
        "Nº série",
        "Origem",
        tipo === "saida" ? "Setor" : "Voltou?",
      ],
    ],
    body: eqs.map((e, i) => [
      String(i + 1),
      e.patrimonio,
      tipoById(e.tipoId)?.nome ?? "",
      e.modelo,
      e.serie,
      e.origem === "alugado" ? "ALUGADO" : "Patrimonial",
      tipo === "saida"
        ? (op.setores.find((s) => s.id === e.setorId)?.nome ?? "")
        : op.retornados.includes(e.id)
          ? "SIM"
          : "NÃO",
    ]),
    headStyles: { fillColor: VERDE },
    styles: { fontSize: 8 },
    didParseCell: (d) => {
      if (
        tipo === "retorno" &&
        d.section === "body" &&
        d.column.index === 6 &&
        d.cell.raw === "NÃO"
      ) {
        d.cell.styles.textColor = [200, 30, 30];
        d.cell.styles.fontStyle = "bold";
      }
    },
  });

  const dem = demanda(op);
  const avulsos = TIPOS.filter(
    (t) => t.controle !== "patrimonio" && (dem[t.id] || op.qtdSaida[t.id]),
  );
  autoTable(doc, {
    startY: y(doc),
    head: [
      [
        "Item por quantidade / serviço",
        "Previsto",
        "Enviado",
        tipo === "retorno" ? "Retornou" : "Conferido",
      ],
    ],
    body: avulsos.map((t) => [
      t.nome,
      String(dem[t.id] || 0),
      t.controle === "servico"
        ? op.servicosOk[t.id]
          ? "OK"
          : "—"
        : String(op.qtdSaida[t.id] || 0),
      tipo === "retorno" ? String(op.qtdRetorno[t.id] || 0) : "[   ]",
    ]),
    headStyles: { fillColor: ROSA },
    styles: { fontSize: 8 },
  });
  assinaturas(doc);
  rodape(doc);
  doc.save(
    `${tipo === "saida" ? "Saida" : "Retorno"}_${op.local}_${op.dias[0]?.data ?? "sem-data"}.pdf`,
  );
}
