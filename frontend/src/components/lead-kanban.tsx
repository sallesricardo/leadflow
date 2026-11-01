
"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  DndContext,
  PointerSensor,
  closestCorners,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Plus } from "lucide-react";

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
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    isDragging,
  } = useDraggable({ id: `lead-${lead.id}` });

  const style = {
    transform: CSS.Transform.toString(transform),
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <article
      ref={setNodeRef}
      style={style}
      className="rounded-lg border bg-card p-3 shadow-sm"
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
        <p className="mt-1 text-sm text-muted-foreground">
          {lead.phone}
        </p>
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
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
  );

  const loadLeads = useCallback(async () => {
    const token = localStorage.getItem("leadflow_token");

    if (!token) {
      window.location.href = "/login";
      return;
    }

    try {
      setError(null);
      const data = await apiFetch<Lead[]>("/api/v1/leads", { token });
      setLeads(data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Erro ao carregar os leads.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadLeads();
  }, [loadLeads]);

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
      const token = localStorage.getItem("leadflow_token");

      if (!token) {
        throw new Error("Sessão expirada. Faça login novamente.");
      }

      await apiFetch<Lead>(`/api/v1/leads/${leadId}`, {
        method: "PATCH",
        token,
        body: JSON.stringify({ status: newStatus }),
      });
    } catch (err) {
      setLeads(previousLeads);
      setError(
        err instanceof Error
          ? `Não foi possível mover o lead: ${err.message}`
          : "Não foi possível atualizar o lead.",
      );
    }
  }

  if (loading) {
    return (
      <div className="flex gap-4 overflow-x-auto pb-4">
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
        </div>

        <Button asChild>
          <Link href="/dashboard/leads/new">
            <Plus className="mr-2 size-4" />
            Novo lead
          </Link>
        </Button>
      </div>

      {error && (
        <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          {error}
          <button
            type="button"
            className="ml-2 underline"
            onClick={() => setError(null)}
          >
            Fechar
          </button>
        </div>
      )}

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-4 overflow-x-auto pb-4">
          {columns.map((column) => (
            <KanbanColumn
              key={column.status}
              status={column.status}
              title={column.title}
              leads={leads.filter(
                (lead) => lead.status === column.status,
              )}
            />
          ))}
        </div>
      </DndContext>
    </div>
  );
}

