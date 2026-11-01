
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Users,
  Activity,
  Trophy,
  ChartNoAxesCombined,
} from "lucide-react";

import { apiFetch } from "@/lib/api";
import type { Lead, LeadStatus } from "@/lib/types";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

const statusConfig: Record<LeadStatus, { label: string; className: string }> = {
  NEW: {
    label: "Novo",
    className: "bg-blue-100 text-blue-800",
  },
  CONTACTED: {
    label: "Contatado",
    className: "bg-sky-100 text-sky-800",
  },
  QUALIFIED: {
    label: "Qualificado",
    className: "bg-indigo-100 text-indigo-800",
  },
  PROPOSAL: {
    label: "Proposta",
    className: "bg-violet-100 text-violet-800",
  },
  NEGOTIATION: {
    label: "Negociação",
    className: "bg-amber-100 text-amber-800",
  },
  WON: {
    label: "Ganho",
    className: "bg-emerald-100 text-emerald-800",
  },
  LOST: {
    label: "Perdido",
    className: "bg-red-100 text-red-800",
  },
};

function MetricCard({
  title,
  value,
  description,
  icon: Icon,
}: {
  title: string;
  value: string | number;
  description: string;
  icon: React.ElementType;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium">
          {title}
        </CardTitle>
        <Icon className="size-4 text-muted-foreground" />
      </CardHeader>

      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <p className="text-xs text-muted-foreground">
          {description}
        </p>
      </CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  const router = useRouter();

  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("leadflow_token");

    if (!token) {
      router.replace("/login");
      return;
    }

    let active = true;

    apiFetch<Lead[]>("/api/v1/leads", { token })
      .then((data) => {
        if (active) setLeads(data);
      })
      .catch((err: Error) => {
        if (active) setError(err.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [router]);

  const countByStatus = (status: LeadStatus) =>
    leads.filter((lead) => lead.status === status).length;

  const total = leads.length;
  const won = countByStatus("WON");

  const activeLeads = leads.filter((lead) =>
    ["CONTACTED", "QUALIFIED", "PROPOSAL", "NEGOTIATION"].includes(
      lead.status
    )
  ).length;

  const conversion = total > 0
    ? Math.round((won / total) * 100)
    : 0;

  const recentLeads = [...leads]
    .sort(
      (a, b) =>
        new Date(b.created_at).getTime() -
        new Date(a.created_at).getTime()
    )
    .slice(0, 5);

  const statuses = Object.keys(statusConfig) as LeadStatus[];

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-72" />
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-28" />
          ))}
        </div>

        <Skeleton className="h-80 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <p className="text-sm text-destructive">{error}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Dashboard
        </h1>
        <p className="text-sm text-muted-foreground">
          Visão geral dos seus leads e oportunidades.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          title="Total de leads"
          value={total}
          description="Todos os leads cadastrados"
          icon={Users}
        />

        <MetricCard
          title="Em andamento"
          value={activeLeads}
          description="Oportunidades ativas"
          icon={Activity}
        />

        <MetricCard
          title="Ganhos"
          value={won}
          description="Negócios fechados"
          icon={Trophy}
        />

        <MetricCard
          title="Conversão"
          value={`${conversion}%`}
          description="Ganhos sobre o total"
          icon={ChartNoAxesCombined}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Distribuição do pipeline</CardTitle>
          </CardHeader>

          <CardContent className="space-y-5">
            {statuses.map((status) => {
              const count = countByStatus(status);
              const percentage = total > 0
                ? (count / total) * 100
                : 0;

              return (
                <div key={status} className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>{statusConfig[status].label}</span>
                    <span className="text-muted-foreground">
                      {count}
                    </span>
                  </div>

                  <div className="h-2 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary transition-all"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Leads recentes</CardTitle>
          </CardHeader>

          <CardContent>
            {recentLeads.length === 0 ? (
              <div className="flex min-h-48 items-center justify-center text-sm text-muted-foreground">
                Nenhum lead cadastrado ainda.
              </div>
            ) : (
              <div className="space-y-5">
                {recentLeads.map((lead) => (
                  <div
                    key={lead.id}
                    className="flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {lead.name}
                      </p>

                      <p className="truncate text-xs text-muted-foreground">
                        {lead.email || lead.phone || "Sem contato"}
                      </p>
                    </div>

                    <Badge
                      variant="outline"
                      className={statusConfig[lead.status].className}
                    >
                      {statusConfig[lead.status].label}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

