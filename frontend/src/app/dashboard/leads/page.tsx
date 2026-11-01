
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, Plus, Users } from "lucide-react";

import { apiFetch } from "@/lib/api";
import type { Lead, LeadStatus } from "@/lib/types";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const statusConfig: Record<
  LeadStatus,
  { label: string; className: string }
> = {
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

export default function LeadsPage() {
  const router = useRouter();

  const [leads, setLeads] = useState<Lead[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
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

  const filteredLeads = useMemo(() => {
    const term = search.trim().toLowerCase();

    return leads.filter((lead) => {
      const matchesSearch =
        !term ||
        [
          lead.name,
          lead.email,
          lead.phone,
          lead.source,
        ].some((value) => value?.toLowerCase().includes(term));

      const matchesStatus =
        statusFilter === "ALL" || lead.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [leads, search, statusFilter]);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Leads
          </h1>
          <p className="text-sm text-muted-foreground">
            Gerencie seus contatos e oportunidades.
          </p>
        </div>

        <Button onClick={() => router.push("/dashboard/leads/new")}>
          <Plus className="mr-2 size-4" />
          Novo lead
        </Button>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />

          <Input
            placeholder="Buscar por nome, e-mail, telefone ou origem..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="pl-9"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value)}
          className="h-9 rounded-md border border-input bg-background px-3 text-sm"
        >
          <option value="ALL">Todos os status</option>

          {Object.entries(statusConfig).map(([value, config]) => (
            <option key={value} value={value}>
              {config.label}
            </option>
          ))}
        </select>
      </div>

      {error && (
        <div className="rounded-md border border-destructive/50 p-4 text-sm text-destructive">
          Não foi possível carregar os leads: {error}
        </div>
      )}

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Contato</TableHead>
              <TableHead>Origem</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Cadastro</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {filteredLeads.map((lead) => (
              <TableRow
                key={lead.id}
                className="cursor-pointer"
                onClick={() =>
                  router.push(`/dashboard/leads/${lead.id}`)
                }
              >
                <TableCell className="font-medium">
                  {lead.name}
                </TableCell>

                <TableCell>
                  <div className="flex flex-col">
                    <span className="text-sm">
                      {lead.email || "—"}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {lead.phone || ""}
                    </span>
                  </div>
                </TableCell>

                <TableCell>
                  {lead.source || "—"}
                </TableCell>

                <TableCell>
                  <Badge
                    variant="outline"
                    className={statusConfig[lead.status].className}
                  >
                    {statusConfig[lead.status].label}
                  </Badge>
                </TableCell>

                <TableCell className="text-right text-muted-foreground">
                  {new Date(lead.created_at).toLocaleDateString("pt-BR")}
                </TableCell>
              </TableRow>
            ))}

            {filteredLeads.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="h-40 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <Users className="size-8 text-muted-foreground" />

                    <p className="text-sm font-medium">
                      Nenhum lead encontrado
                    </p>

                    <p className="text-xs text-muted-foreground">
                      Tente alterar os filtros ou cadastre um novo lead.
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <p className="text-xs text-muted-foreground">
        Exibindo {filteredLeads.length} de {leads.length} leads.
      </p>
    </div>
  );
}

