import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Download, FileDown, FileSpreadsheet } from "lucide-react";
import { useStore, hojeISO, fmtData, STATUS_EQUIP, STATUS_OP } from "@/lib/store";
import { TIPOS, tipoById } from "@/lib/catalog";
import { PageTitle } from "@/components/app-shell";
import { pdfDoDia } from "@/lib/pdf";
import { toCsv } from "@/lib/csv";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/relatorio")({
  head: () => ({
    meta: [
      { title: "Relatórios · Controle T.I." },
      {
        name: "description",
        content:
          "Exporte o relatório diário de movimentações, equipamentos fora do CD e saldo do estoque em PDF.",
      },
      { property: "og:title", content: "Relatórios · Controle T.I." },
      { property: "og:description", content: "Relatório diário de equipamentos em PDF." },
    ],
  }),
  component: Relatorio,
});

const COR: Record<string, string> = {
  entrada: "bg-ok text-ok-foreground",
  separacao: "bg-warn text-warn-foreground",
  saida: "bg-info text-info-foreground",
  retorno: "bg-primary text-primary-foreground",
  manutencao: "bg-rent text-rent-foreground",
  ajuste: "bg-muted",
  falta: "bg-danger text-danger-foreground",
};

function Relatorio() {
  const s = useStore();
  const [data, setData] = useState(hojeISO());
  const movs = s.movimentos.filter((m) => m.ts.slice(0, 10) === data);

  const backup = () => {
    const blob = new Blob(
      [
        JSON.stringify({
          equipamentos: s.equipamentos,
          estoqueQtd: s.estoqueQtd,
          operacoes: s.operacoes,
          modelos: s.modelos,
          movimentos: s.movimentos,
        }),
      ],
      { type: "application/json" },
    );
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `backup_controle_ti_${hojeISO()}.json`;
    a.click();
  };
  const restaurar = (f: File) =>
    f.text().then((t) => {
      if (confirm("Substituir todos os dados por este backup?")) {
        useStore.setState(JSON.parse(t));
      }
    });
  const exportCsv = () => {
    const rows: (string | number)[][] = [
      [
        "Seção",
        "Data",
        "Hora",
        "Tipo",
        "Patrimônio",
        "Item/modelo",
        "Local",
        "Detalhes",
        "Disponível",
        "Em campo",
        "Manutenção",
        "Alugados",
      ],
    ];
    for (const movement of movs.slice().reverse()) {
      rows.push([
        "Movimentação",
        data,
        new Date(movement.ts).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
        movement.tipo,
        "",
        "",
        "",
        movement.texto,
        "",
        "",
        "",
        "",
      ]);
    }
    const operations = s.operacoes.filter(
      (operation) =>
        operation.dias.some((day) => day.data === data) ||
        operation.status === "campo" ||
        operation.status === "separando",
    );
    for (const operation of operations) {
      const assigned = s.equipamentos.filter((equipment) => equipment.operacaoId === operation.id);
      const inicio = operation.dias[0]?.data ?? data;
      const fim = operation.dias[operation.dias.length - 1]?.data ?? inicio;
      rows.push([
        "Mutirão",
        `${inicio} a ${fim}`,
        "",
        STATUS_OP[operation.status].label,
        "",
        "",
        operation.local,
        `Responsável: ${operation.responsavel || "não informado"}; equipamentos: ${assigned.length}; retorno: ${operation.retornados.length}/${assigned.length}`,
        "",
        "",
        "",
        "",
      ]);
    }
    for (const equipment of s.equipamentos.filter(
      (item) => item.status === "campo" || item.status === "separado",
    )) {
      rows.push([
        "Equipamento fora do CD",
        data,
        "",
        STATUS_EQUIP[equipment.status].label,
        equipment.patrimonio,
        `${tipoById(equipment.tipoId)?.nome ?? equipment.tipoId} · ${equipment.modelo}`,
        s.operacoes.find((operation) => operation.id === equipment.operacaoId)?.local ?? "",
        equipment.obs,
        "",
        "",
        "",
        equipment.origem === "alugado" ? 1 : 0,
      ]);
    }
    for (const type of TIPOS.filter((item) => item.controle !== "servico")) {
      const assets = s.equipamentos.filter((equipment) => equipment.tipoId === type.id);
      rows.push([
        "Saldo no CD",
        data,
        "",
        "",
        "",
        type.nome,
        "Centro de Distribuição",
        "",
        type.controle === "quantidade"
          ? s.estoqueQtd[type.id] || 0
          : assets.filter((equipment) => equipment.status === "disponivel").length,
        assets.filter(
          (equipment) => equipment.status === "campo" || equipment.status === "separado",
        ).length,
        assets.filter((equipment) => equipment.status === "manutencao").length,
        assets.filter((equipment) => equipment.origem === "alugado").length,
      ]);
    }
    const blob = new Blob([toCsv(rows)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `ControleTI_${data}.csv`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 0);
  };

  return (
    <>
      <PageTitle
        title="Relatório diário"
        sub="Exporte movimentações, operações e saldo para conferência e arquivo."
      />
      <div className="mb-6 flex flex-col gap-3 rounded-2xl border-2 border-primary bg-card p-5 sm:flex-row sm:items-end">
        <label className="text-sm font-bold">
          Data
          <Input
            type="date"
            value={data}
            onChange={(e) => setData(e.target.value)}
            className="mt-1 h-14 text-lg"
          />
        </label>
        <Button
          size="lg"
          className="h-14 flex-1 gap-2 text-lg font-bold"
          onClick={() => pdfDoDia(data, s.operacoes, s.equipamentos, s.movimentos, s.estoqueQtd)}
        >
          <FileDown /> Baixar PDF
        </Button>
        <Button
          size="lg"
          variant="outline"
          className="h-14 flex-1 gap-2 text-lg font-bold"
          onClick={exportCsv}
        >
          <FileSpreadsheet /> Baixar CSV
        </Button>
      </div>
      <h2 className="mb-3 text-xl font-bold">
        Movimentações em {fmtData(data)} ({movs.length})
      </h2>
      <div className="rounded-2xl border bg-card">
        {movs.map((m) => (
          <div key={m.id} className="flex items-center gap-3 border-b p-3 last:border-0">
            <span className="w-12 text-sm text-muted-foreground">
              {new Date(m.ts).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
            </span>
            <span
              className={cn(
                "w-24 rounded px-2 py-0.5 text-center text-xs font-bold uppercase",
                COR[m.tipo],
              )}
            >
              {m.tipo}
            </span>
            <span className="text-sm">{m.texto}</span>
          </div>
        ))}
        {movs.length === 0 && (
          <p className="p-6 text-center text-muted-foreground">Nada registrado neste dia.</p>
        )}
      </div>
      <div className="mt-8 rounded-2xl bg-muted p-5">
        <p className="font-bold">Cópia de segurança</p>
        <p className="mb-3 text-sm text-muted-foreground">
          Os dados ficam salvos neste navegador. Baixe uma cópia regularmente para não perder nada.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" className="gap-2" onClick={backup}>
            <Download className="h-4 w-4" /> Baixar cópia
          </Button>
          <label className="inline-flex cursor-pointer items-center rounded-md border bg-card px-4 text-sm font-medium">
            Restaurar cópia
            <input
              type="file"
              accept=".json"
              hidden
              onChange={(e) => e.target.files?.[0] && restaurar(e.target.files[0])}
            />
          </label>
        </div>
      </div>
    </>
  );
}
