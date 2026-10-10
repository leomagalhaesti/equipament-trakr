import { Link } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import {
  CalendarDays,
  ClipboardList,
  FileDown,
  FlaskConical,
  LayoutDashboard,
  PackagePlus,
  Boxes,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/", label: "Painel", icon: LayoutDashboard },
  { to: "/cronograma", label: "Mutirões", icon: CalendarDays },
  { to: "/entrada", label: "Entrada", icon: PackagePlus },
  { to: "/estoque", label: "Estoque", icon: Boxes },
  { to: "/kits", label: "Kits", icon: ClipboardList },
  { to: "/relatorio", label: "Relatórios", icon: FileDown },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const [pronto, setPronto] = useState(false);
  const [agora, setAgora] = useState<Date | null>(null);
  useEffect(() => {
    setPronto(true);
    const atualizarHora = () => setAgora(new Date());
    atualizarHora();
    const relogio = window.setInterval(atualizarHora, 1000);
    return () => window.clearInterval(relogio);
  }, []);
  return (
    <div className="min-h-screen pb-24 md:pb-8">
      <header className="sticky top-0 z-30 border-b border-accent/25 bg-accent/5 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3">
          <Link to="/" className="flex items-center gap-2">
            <img
              src="./controle-ti-logo.svg"
              alt="Controle T.I."
              className="h-10 w-auto max-w-[120px] object-contain"
            />
            <span className="leading-tight">
              <span className="block text-sm font-bold">Controle T.I.</span>
              <span className="hidden text-[11px] font-semibold uppercase tracking-widest text-muted-foreground sm:block">
                TI · Centro de Distribuição
              </span>
            </span>
          </Link>
          <nav className="ml-auto hidden gap-1 md:flex">
            {NAV.map((n) => (
              <Link
                key={n.to}
                to={n.to}
                activeOptions={{ exact: n.to === "/" }}
                className="flex items-center gap-2 rounded-lg border border-transparent px-3 py-2 text-sm font-semibold text-muted-foreground transition hover:bg-accent/10 hover:text-foreground"
                activeProps={{ className: "!border-accent/30 !bg-accent/15 !text-foreground" }}
              >
                <n.icon className="h-4 w-4" />
                {n.label}
              </Link>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-3 md:ml-0">
            <time
              dateTime={agora?.toISOString()}
              aria-label={
                agora ? `Horário local ${agora.toLocaleTimeString("pt-BR")}` : "Horário local"
              }
              className="min-w-[4.5rem] text-right font-mono tabular-nums"
            >
              <span className="block text-[10px] uppercase text-muted-foreground">
                {agora?.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }) ??
                  "--/--"}
              </span>
              <span className="block text-sm font-semibold">
                {agora?.toLocaleTimeString("pt-BR", {
                  hour: "2-digit",
                  minute: "2-digit",
                  second: "2-digit",
                }) ?? "--:--:--"}
              </span>
            </time>
            <span className="hidden rounded-full border border-accent/30 bg-accent/10 px-3 py-1 text-xs font-bold text-foreground sm:inline-flex">
              Demonstração
            </span>
          </div>
        </div>
      </header>
      <aside
        aria-label="Aviso de protótipo de teste"
        className="mx-auto mt-4 flex max-w-7xl items-start gap-3 border-l-4 border-amber-500 bg-amber-50 px-4 py-3 text-amber-950 dark:bg-amber-950/30 dark:text-amber-100"
      >
        <FlaskConical className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
        <div className="min-w-0">
          <p className="text-sm font-bold uppercase">Protótipo básico de teste</p>
          <p className="text-sm">
            Não é o sistema oficial. Os dados ficam neste navegador e não sincronizam com o GLPI.
          </p>
        </div>
      </aside>
      <main className="mx-auto max-w-7xl px-4 py-6">
        {pronto ? (
          children
        ) : (
          <div className="py-24 text-center text-muted-foreground">Carregando…</div>
        )}
      </main>
      <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-6 border-t border-accent/25 bg-card md:hidden">
        {NAV.map((n) => (
          <Link
            key={n.to}
            to={n.to}
            activeOptions={{ exact: n.to === "/" }}
            className="flex flex-col items-center gap-1 py-2 text-[10px] font-semibold text-muted-foreground"
            activeProps={{ className: "!bg-accent/10 !text-foreground [&_svg]:!text-accent" }}
          >
            <n.icon className="h-5 w-5" />
            {n.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}

export function PageTitle({
  title,
  sub,
  children,
}: {
  title: string;
  sub?: string;
  children?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="font-display text-3xl font-extrabold tracking-tight">{title}</h1>
        {sub && <p className="mt-1 text-muted-foreground">{sub}</p>}
      </div>
      {children && <div className="flex flex-wrap gap-2">{children}</div>}
    </div>
  );
}

export function OrigemBadge({ origem }: { origem: "patrimonial" | "alugado" }) {
  return (
    <span
      className={cn(
        "rounded-md px-2 py-0.5 text-xs font-bold uppercase",
        origem === "alugado" ? "bg-rent text-rent-foreground" : "bg-own text-own-foreground",
      )}
    >
      {origem === "alugado" ? "Alugado" : "Patrimonial"}
    </span>
  );
}

export const MODELO_COR: Record<string, string> = {
  cirurgia: "bg-primary text-primary-foreground",
  oftalmo: "bg-info text-info-foreground",
  triagem: "bg-accent text-accent-foreground",
  surpresa: "bg-danger text-danger-foreground",
};
