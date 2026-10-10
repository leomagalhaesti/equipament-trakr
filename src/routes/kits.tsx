import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useStore, uid } from "@/lib/store";
import { TIPOS, tipoById, MODELOS_PADRAO, type Modelo } from "@/lib/catalog";
import { PageTitle, MODELO_COR } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/kits")({
  head: () => ({
    meta: [
      { title: "Kits por projeto · Controle T.I." },
      {
        name: "description",
        content:
          "Listas padrão de equipamentos por setor para Cirurgias Eletivas, Oftalmologia e Triagem/Exames.",
      },
      { property: "og:title", content: "Kits por projeto · Controle T.I." },
      {
        property: "og:description",
        content: "Listas padrão de equipamentos por setor de cada projeto.",
      },
    ],
  }),
  component: Kits,
});

function Kits() {
  const { modelos, updateModelo, resetCronograma } = useStore();
  const [sel, setSel] = useState(modelos[0]?.id ?? "");
  const m = modelos.find((x) => x.id === sel);
  const salvar = (nm: Modelo) => updateModelo(nm);
  const modeloPadrao = MODELOS_PADRAO.find((x) => x.id === sel);

  if (!m) return <p className="py-10 text-center text-muted-foreground">Nenhum kit cadastrado.</p>;

  return (
    <>
      <PageTitle
        title="Kits padrão"
        sub="Base usada por todos os novos mutirões. ‘Acompanha equipe’ = a quantidade cresce/diminui conforme o nº de funcionários do setor."
      >
        <Button
          variant="outline"
          disabled={!modeloPadrao}
          onClick={() => modeloPadrao && updateModelo(structuredClone(modeloPadrao))}
        >
          Restaurar lista oficial
        </Button>
        <Button
          variant="outline"
          onClick={() => {
            if (
              confirm(
                "Recriar todos os mutirões do cronograma de outubro? Separações em andamento serão perdidas.",
              )
            ) {
              resetCronograma();
              toast.success("Cronograma recriado");
            }
          }}
        >
          Recriar cronograma
        </Button>
      </PageTitle>
      <div className="mb-5 grid grid-cols-3 gap-2">
        {modelos.map((x) => (
          <button
            key={x.id}
            onClick={() => setSel(x.id)}
            className={cn(
              "rounded-xl border-2 p-4 font-display text-lg font-bold",
              sel === x.id ? MODELO_COR[x.cor] : "bg-card",
            )}
          >
            {x.nome}
          </button>
        ))}
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {m.setores.map((s, si) => (
          <div key={s.id} className="rounded-2xl border bg-card p-4">
            <div className="mb-3 flex items-center gap-2">
              <Input
                value={s.nome}
                onChange={(e) =>
                  salvar({
                    ...m,
                    setores: m.setores.map((x, j) =>
                      j === si ? { ...x, nome: e.target.value } : x,
                    ),
                  })
                }
                className="font-display font-bold"
              />
              <label className="flex items-center gap-1 whitespace-nowrap text-xs font-semibold">
                Equipe base
                <input
                  type="number"
                  min={1}
                  value={s.equipeBase}
                  onChange={(e) =>
                    salvar({
                      ...m,
                      setores: m.setores.map((x, j) =>
                        j === si ? { ...x, equipeBase: Math.max(1, +e.target.value) } : x,
                      ),
                    })
                  }
                  className="h-9 w-14 rounded-md border text-center font-bold"
                />
              </label>
              <button
                onClick={() =>
                  confirm("Remover setor?") &&
                  salvar({ ...m, setores: m.setores.filter((_, j) => j !== si) })
                }
              >
                <Trash2 className="h-4 w-4 text-danger" />
              </button>
            </div>
            {s.itens.map((it, ii) => {
              const upd = (p: Partial<typeof it>) =>
                salvar({
                  ...m,
                  setores: m.setores.map((x, j) =>
                    j === si
                      ? { ...x, itens: x.itens.map((y, k) => (k === ii ? { ...y, ...p } : y)) }
                      : x,
                  ),
                });
              return (
                <div key={ii} className="flex items-center gap-2 border-t py-1.5 text-sm">
                  <span className="flex-1">{tipoById(it.tipoId)?.nome}</span>
                  <label className="flex items-center gap-1 text-xs">
                    <input
                      type="checkbox"
                      checked={it.escala}
                      onChange={(e) => upd({ escala: e.target.checked })}
                    />{" "}
                    acompanha equipe
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={it.qtd}
                    onChange={(e) => upd({ qtd: Math.max(0, +e.target.value) })}
                    className="h-8 w-14 rounded-md border text-center font-bold"
                  />
                  <button
                    onClick={() =>
                      salvar({
                        ...m,
                        setores: m.setores.map((x, j) =>
                          j === si ? { ...x, itens: x.itens.filter((_, k) => k !== ii) } : x,
                        ),
                      })
                    }
                  >
                    <Trash2 className="h-4 w-4 text-muted-foreground" />
                  </button>
                </div>
              );
            })}
            <select
              value=""
              onChange={(e) =>
                e.target.value &&
                salvar({
                  ...m,
                  setores: m.setores.map((x, j) =>
                    j === si
                      ? {
                          ...x,
                          itens: [...x.itens, { tipoId: e.target.value, qtd: 1, escala: false }],
                        }
                      : x,
                  ),
                })
              }
              className="mt-2 h-9 w-full rounded-md border bg-background px-2 text-sm"
            >
              <option value="">+ adicionar item…</option>
              {TIPOS.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.nome}
                </option>
              ))}
            </select>
          </div>
        ))}
        <button
          onClick={() =>
            salvar({
              ...m,
              setores: [...m.setores, { id: uid(), nome: "Novo setor", equipeBase: 1, itens: [] }],
            })
          }
          className="flex min-h-32 items-center justify-center gap-2 rounded-2xl border-2 border-dashed font-bold text-muted-foreground hover:border-primary hover:text-primary"
        >
          <Plus /> Novo setor
        </button>
      </div>
    </>
  );
}
