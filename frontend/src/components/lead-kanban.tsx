"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  DndContext,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  closestCorners,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { GripVertical, Plus, Search, X } from "lucide-react";
import { toast } from "sonner";

import { apiFetch } from "@/lib/api";
import type { Lead, LeadStatus } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

const columns: { status: LeadStatus; title: string }[] = [
  { status: "NEW", title: "Novo" },
  { status: "CONTACTED", title: "Contatado" },
  { status: "QUALIFIED", title: "Qualificado" },
  { status: "PROPOSAL", title: "Proposta" },
  { status: "NEGOTIATION", title: "Negociação" },
  { status: "WON", title: "Ganho" },
  { status: "LOST", title: "Perdido" },
];

function DraggableLead({ lead }: { lead: Lead }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `lead-${lead.id}`,
  });

  return (
    <article
      ref={setNodeRef}
      className={`rounded-lg border bg-card p-3 shadow-sm transition-shadow ${isDragging ? "opacity-30" : "opacity-100"}`}
    >
      <div className="flex items-start justify-between gap-2">
        <Link
          href={`/dashboard/leads/${lead.id}`}
          className="min-w-0 flex-1 font-medium hover:underline"
        >
          {lead.name}
        </Link>

        <button
          type="button"
          {...listeners}
          {...attributes}
          className="cursor-grab touch-none rounded p-1 text-muted-foreground hover:bg-muted active:cursor-grabbing"
          aria-label={`Mover lead ${lead.name}`}
        >
          <GripVertical className="size-4" />
        </button>
      </div>

      {lead.email && (
        <p className="mt-2 truncate text-sm text-muted-foreground">
          {lead.email}
        </p>
      )}

      {lead.phone && (
        <p className="mt-1 text-sm text-muted-foreground">{lead.phone}</p>
      )}

      {lead.source && (
        <div className="mt-3">
          <Badge variant="secondary">{lead.source}</Badge>
        </div>
      )}

      <p className="mt-3 text-xs text-muted-foreground">
        Criado em {new Date(lead.created_at).toLocaleDateString("pt-BR")}
      </p>
    </article>
  );
}

function KanbanColumn({
  status,
  title,
  leads,
}: {
  status: LeadStatus;
  title: string;
  leads: Lead[];
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status });

  return (
    <section className="flex min-h-[400px] w-72 shrink-0 flex-col rounded-lg bg-muted/40">
      <header className="flex items-center justify-between border-b p-3">
        <h2 className="font-semibold">{title}</h2>
        <Badge variant="secondary">{leads.length}</Badge>
      </header>

      <div
        ref={setNodeRef}
        className={`flex flex-1 flex-col gap-3 p-3 transition-colors ${
          isOver ? "bg-primary/5" : ""
        }`}
      >
        {leads.map((lead) => (
          <DraggableLead key={lead.id} lead={lead} />
        ))}

        {leads.length === 0 && (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Nenhum lead nesta etapa
          </p>
        )}
      </div>
    </section>
  );
}

export function LeadKanban() {
  const [activeLead, setActiveLead] = useState<Lead | null>(null);
  const [search, setSearch] = useState("");
  const [sourceFilter, setSourceFilter] = useState("ALL");
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
  );

  function handleDragStart(event: DragStartEvent) {
    const leadId = Number(String(event.active.id).replace("lead-", ""));

    const lead = leads.find((item) => item.id === leadId);

    setActiveLead(lead ?? null);
  }

  useEffect(() => {
    let active = true;

    apiFetch<Lead[]>("/api/v1/leads")
      .then((data) => {
        if (active) setLeads(data);
      })
      .catch((err: Error) => {
        if (active) toast.error(err.message || "Erro ao carregar os leads.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const sources = useMemo(() => {
    const values = leads
      .map((lead) => lead.source?.trim().toLowerCase())
      .filter((source): source is string => Boolean(source));

    return [...new Set(values)].sort((a, b) => a.localeCompare(b));
  }, [leads]);

  const filteredLeads = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return leads.filter((lead) => {
      const matchesSearch =
        !normalizedSearch ||
        lead.name.toLowerCase().includes(normalizedSearch) ||
        lead.email?.toLowerCase().includes(normalizedSearch) ||
        lead.phone?.toLowerCase().includes(normalizedSearch);

      const matchesSource =
        sourceFilter === "ALL" || lead.source === sourceFilter;

      return matchesSearch && matchesSource;
    });
  }, [leads, search, sourceFilter]);

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;

    if (!over) return;

    const leadId = Number(String(active.id).replace("lead-", ""));
    const newStatus = String(over.id) as LeadStatus;

    const lead = leads.find((item) => item.id === leadId);

    if (!lead || lead.status === newStatus) return;

    const previousLeads = leads;

    setLeads((current) =>
      current.map((item) =>
        item.id === leadId ? { ...item, status: newStatus } : item,
      ),
    );

    try {
      await apiFetch<Lead>(`/api/v1/leads/${leadId}`, {
        method: "PATCH",
        body: JSON.stringify({ status: newStatus }),
      });
      toast.success("Lead movido com sucesso.");
    } catch (err) {
      setLeads(previousLeads);
      toast.error(
        err instanceof Error
          ? `Não foi possível mover o lead: ${err.message}`
          : "Não foi possível atualizar o lead.",
      );
    }
  }

  if (loading) {
    return (
      <div className="flex min-w-0 max-w-full gap-4 overflow-x-auto pb-4">
        {columns.map((column) => (
          <div key={column.status} className="w-72 shrink-0 space-y-3">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-28 w-full" />
            <Skeleton className="h-28 w-full" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Pipeline</h1>
          <p className="text-sm text-muted-foreground">
            Acompanhe seus leads em cada etapa do funil.
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {filteredLeads.length} de {leads.length} leads
          </p>
        </div>

        <Button
          nativeButton={false}
          render={<Link href="/dashboard/leads/new" />}
        >
          <Plus className="mr-2 size-4" />
          Novo lead
        </Button>
      </div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />

          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar por nome, e-mail ou telefone..."
            className="h-10 w-full rounded-md border bg-background pl-9 pr-9 text-sm outline-none focus:ring-2 focus:ring-ring"
          />

          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              aria-label="Limpar busca"
            >
              <X className="size-4" />
            </button>
          )}
        </div>

        <select
          value={sourceFilter}
          onChange={(event) => setSourceFilter(event.target.value)}
          className="h-10 rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="ALL">Todas as origens</option>

          {sources.map((source) => (
            <option key={source} value={source}>
              {source}
            </option>
          ))}
        </select>

        {(search || sourceFilter !== "ALL") && (
          <Button
            variant="ghost"
            onClick={() => {
              setSearch("");
              setSourceFilter("ALL");
            }}
          >
            Limpar filtros
          </Button>
        )}
      </div>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={(event) => {
          handleDragEnd(event);
          setActiveLead(null);
        }}
        onDragCancel={() => setActiveLead(null)}
      >
        <div className="flex min-w-0 max-w-full gap-4 overflow-x-auto pb-4">
          {columns.map((column) => (
            <KanbanColumn
              key={column.status}
              status={column.status}
              title={column.title}
              leads={filteredLeads.filter(
                (lead) => lead.status === column.status,
              )}
            />
          ))}
        </div>

        <DragOverlay>
          {activeLead ? (
            <article className="rotate-2 rounded-lg border bg-card p-3 shadow-xl ring-2 ring-primary/30">
              <p className="font-medium">{activeLead.name}</p>

              {activeLead.email && (
                <p className="mt-2 truncate text-sm text-muted-foreground">
                  {activeLead.email}
                </p>
              )}

              {activeLead.phone && (
                <p className="mt-1 text-sm text-muted-foreground">
                  {activeLead.phone}
                </p>
              )}

              {activeLead.source && (
                <div className="mt-3">
                  <Badge variant="secondary">{activeLead.source}</Badge>
                </div>
              )}
            </article>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
