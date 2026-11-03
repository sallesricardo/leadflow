"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Percent,
  TrendingDown,
  TrendingUp,
  UsersRound,
} from "lucide-react";

import { apiFetch } from "@/lib/api";
import type { LeadStatus } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface DashboardMetricsData {
  total_leads: number;
  status_counts: { status: LeadStatus; count: number }[];
  conversion_rate: number;
  won_value: string | number;
  lost_value: string | number;
  source_metrics: {
    source: string;
    lead_count: number;
    won_count: number;
    conversion_rate: number;
  }[];
}

const statusLabels: Record<LeadStatus, string> = {
  NEW: "Novo",
  CONTACTED: "Contatado",
  QUALIFIED: "Qualificado",
  PROPOSAL: "Proposta",
  NEGOTIATION: "Negociação",
  WON: "Ganho",
  LOST: "Perdido",
};

const statusBarColors: Record<LeadStatus, string> = {
  NEW: "bg-blue-500",
  CONTACTED: "bg-sky-500",
  QUALIFIED: "bg-indigo-500",
  PROPOSAL: "bg-violet-500",
  NEGOTIATION: "bg-amber-500",
  WON: "bg-emerald-500",
  LOST: "bg-red-500",
};

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

function MetricCard({
  label,
  value,
  description,
  icon: Icon,
}: {
  label: string;
  value: string;
  description: string;
  icon: typeof UsersRound;
}) {
  return (
    <Card className="min-w-0 gap-3 py-4">
      <CardHeader className="flex flex-row items-start justify-between gap-3 px-4">
        <CardDescription>{label}</CardDescription>
        <Icon className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
      </CardHeader>
      <CardContent className="space-y-1 px-4">
        <p className="truncate text-2xl font-semibold tracking-tight">{value}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}

export function DashboardMetrics() {
  const router = useRouter();
  const [metrics, setMetrics] = useState<DashboardMetricsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("leadflow_token");

    if (!token) {
      router.replace("/login");
      return;
    }

    let active = true;

    apiFetch<DashboardMetricsData>("/api/v1/dashboard/metrics", { token })
      .then((data) => {
        if (active) setMetrics(data);
      })
      .catch((err: Error) => {
        if (active) setError(err.message || "Não foi possível carregar as métricas.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [router]);

  if (loading) {
    return (
      <section aria-label="Carregando métricas" className="space-y-4">
        <Skeleton className="h-7 w-36" />
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }, (_, index) => (
            <Skeleton key={index} className="h-28 rounded-xl" />
          ))}
        </div>
      </section>
    );
  }

  if (error || !metrics) {
    return (
      <section aria-label="Métricas do dashboard" className="space-y-3">
        <h2 className="text-lg font-semibold">Resumo</h2>
        <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          {error || "Não foi possível carregar as métricas."}
        </p>
      </section>
    );
  }

  const closedCount = metrics.status_counts
    .filter((item) => item.status === "WON" || item.status === "LOST")
    .reduce((sum, item) => sum + item.count, 0);
  const conversion = new Intl.NumberFormat("pt-BR", {
    maximumFractionDigits: 1,
  }).format(metrics.conversion_rate);

  return (
    <section aria-label="Métricas do dashboard" className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold tracking-tight">Resumo</h2>
        <p className="text-sm text-muted-foreground">Indicadores atuais do seu pipeline comercial.</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Total de leads"
          value={String(metrics.total_leads)}
          description="Leads na sua carteira"
          icon={UsersRound}
        />
        <MetricCard
          label="Conversão"
          value={`${conversion}%`}
          description={`${closedCount} leads concluídos (ganhos ou perdidos)`}
          icon={Percent}
        />
        <MetricCard
          label="Valor ganho"
          value={currencyFormatter.format(Number(metrics.won_value))}
          description="Soma dos valores dos leads ganhos"
          icon={TrendingUp}
        />
        <MetricCard
          label="Valor perdido"
          value={currencyFormatter.format(Number(metrics.lost_value))}
          description="Soma dos valores dos leads perdidos"
          icon={TrendingDown}
        />
      </div>

      <div className="grid min-w-0 gap-4 xl:grid-cols-2">
        <Card className="min-w-0">
          <CardHeader>
            <CardTitle>Leads por etapa</CardTitle>
            <CardDescription>Distribuição atual do pipeline.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {metrics.status_counts.map(({ status, count }) => {
              const percentage = metrics.total_leads
                ? (count / metrics.total_leads) * 100
                : 0;

              return (
                <div key={status} className="space-y-1.5">
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span>{statusLabels[status]}</span>
                    <span className="tabular-nums text-muted-foreground">{count}</span>
                  </div>
                  <div
                    className="h-2 overflow-hidden rounded-full bg-muted"
                    role="progressbar"
                    aria-label={`${statusLabels[status]}: ${count} leads`}
                    aria-valuemin={0}
                    aria-valuemax={metrics.total_leads}
                    aria-valuenow={count}
                  >
                    <div
                      className={`h-full rounded-full transition-[width] ${statusBarColors[status]}`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card className="min-w-0">
          <CardHeader>
            <CardTitle>Desempenho por origem</CardTitle>
            <CardDescription>Conversão calculada entre leads ganhos e perdidos.</CardDescription>
          </CardHeader>
          <CardContent className="min-w-0">
            {metrics.source_metrics.length === 0 ? (
              <div className="rounded-lg border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
                Ainda não há origens para comparar.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Origem</TableHead>
                      <TableHead className="text-right">Leads</TableHead>
                      <TableHead className="text-right">Ganhos</TableHead>
                      <TableHead className="text-right">Conversão</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {metrics.source_metrics.map((source) => (
                      <TableRow key={source.source}>
                        <TableCell className="max-w-36 truncate font-medium">
                          {source.source}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {source.lead_count}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {source.won_count}
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge variant="secondary">
                            {new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 }).format(source.conversion_rate)}%
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
