"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Plus, Trash2, Workflow } from "lucide-react";
import { toast } from "sonner";

import { apiFetch } from "@/lib/api";
import type { AutomationRule, LeadStatus } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const STATUSES: { value: LeadStatus; label: string }[] = [
  { value: "NEW", label: "Novo" },
  { value: "CONTACTED", label: "Contatado" },
  { value: "QUALIFIED", label: "Qualificado" },
  { value: "PROPOSAL", label: "Proposta" },
  { value: "NEGOTIATION", label: "Negociação" },
  { value: "WON", label: "Ganho" },
  { value: "LOST", label: "Perdido" },
];

function statusLabel(status: LeadStatus) {
  return STATUSES.find((item) => item.value === status)?.label ?? status;
}

export default function AutomationsPage() {
  const [rules, setRules] = useState<AutomationRule[]>([]);
  const [name, setName] = useState("");
  const [triggerStatus, setTriggerStatus] = useState<LeadStatus>("QUALIFIED");
  const [taskTitle, setTaskTitle] = useState("Fazer acompanhamento do lead");
  const [taskDescription, setTaskDescription] = useState("");
  const [dueInDays, setDueInDays] = useState("1");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  useEffect(() => {
    let active = true;
    apiFetch<AutomationRule[]>("/api/v1/automations")
      .then((data) => { if (active) setRules(data); })
      .catch((error: Error) => { if (active) toast.error(error.message || "Não foi possível carregar as automações."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  async function createRule(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    try {
      const rule = await apiFetch<AutomationRule>("/api/v1/automations", {
        method: "POST",
        body: JSON.stringify({
          name: name.trim(),
          trigger_status: triggerStatus,
          task_title: taskTitle.trim(),
          task_description: taskDescription.trim() || null,
          due_in_days: Number(dueInDays),
        }),
      });
      setRules((current) => [rule, ...current]);
      setName("");
      setTaskDescription("");
      toast.success("Automação criada.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível criar a automação.");
    } finally {
      setSaving(false);
    }
  }

  async function toggleRule(rule: AutomationRule) {
    setUpdatingId(rule.id);
    try {
      const updated = await apiFetch<AutomationRule>(`/api/v1/automations/${rule.id}`, {
        method: "PATCH",
        body: JSON.stringify({ enabled: !rule.enabled }),
      });
      setRules((current) => current.map((item) => item.id === updated.id ? updated : item));
      toast.success(updated.enabled ? "Automação ativada." : "Automação pausada.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível atualizar a automação.");
    } finally {
      setUpdatingId(null);
    }
  }

  async function deleteRule(rule: AutomationRule) {
    if (!window.confirm(`Remover a automação “${rule.name}”?`)) return;
    setDeletingId(rule.id);
    try {
      await apiFetch<void>(`/api/v1/automations/${rule.id}`, { method: "DELETE" });
      setRules((current) => current.filter((item) => item.id !== rule.id));
      toast.success("Automação removida.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível remover a automação.");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Automações</h1>
        <p className="text-sm text-muted-foreground">Crie tarefas de acompanhamento quando leads entrarem numa etapa do pipeline.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Nova automação</CardTitle>
          <CardDescription>Ao entrar na etapa escolhida, cada lead recebe uma tarefa com o título e o prazo definidos.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={createRule} className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="automation-name">Nome da regra</Label>
              <Input id="automation-name" value={name} onChange={(event) => setName(event.target.value)} placeholder="Ex.: Acompanhar leads qualificados" maxLength={120} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="automation-status">Quando o lead entrar em</Label>
              <select id="automation-status" value={triggerStatus} onChange={(event) => setTriggerStatus(event.target.value as LeadStatus)} className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm">
                {STATUSES.map((status) => <option key={status.value} value={status.value}>{status.label}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="automation-task-title">Título da tarefa criada</Label>
              <Input id="automation-task-title" value={taskTitle} onChange={(event) => setTaskTitle(event.target.value)} maxLength={160} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="automation-due">Prazo da tarefa (dias)</Label>
              <Input id="automation-due" type="number" min={0} max={365} value={dueInDays} onChange={(event) => setDueInDays(event.target.value)} required />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="automation-task-description">Descrição da tarefa (opcional)</Label>
              <Textarea id="automation-task-description" value={taskDescription} onChange={(event) => setTaskDescription(event.target.value)} maxLength={4000} rows={3} />
            </div>
            <div className="md:col-span-2">
              <Button type="submit" disabled={saving}>
                <Plus /> {saving ? "Salvando…" : "Criar automação"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">Regras cadastradas</h2>
          <Badge variant="secondary">{rules.length}</Badge>
        </div>
        {loading ? <p className="text-sm text-muted-foreground">Carregando automações…</p> : rules.length === 0 ? (
          <div className="rounded-lg border border-dashed p-8 text-center">
            <Workflow className="mx-auto mb-3 size-6 text-muted-foreground" />
            <p className="text-sm font-medium">Nenhuma automação cadastrada</p>
            <p className="mt-1 text-sm text-muted-foreground">Crie uma regra para gerar tarefas de acompanhamento automaticamente.</p>
          </div>
        ) : (
          <ul className="space-y-3">
            {rules.map((rule) => (
              <li key={rule.id}>
                <Card>
                  <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center">
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-medium">{rule.name}</h3>
                        <Badge variant={rule.enabled ? "secondary" : "outline"}>{rule.enabled ? "Ativa" : "Pausada"}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Ao entrar em <strong className="font-medium text-foreground">{statusLabel(rule.trigger_status)}</strong>, cria “{rule.task_title}” com prazo de {rule.due_in_days} dia(s).
                      </p>
                      {rule.task_description && <p className="whitespace-pre-wrap text-sm text-muted-foreground">{rule.task_description}</p>}
                    </div>
                    <div className="flex shrink-0 gap-2">
                      <Button type="button" variant="outline" size="sm" disabled={updatingId === rule.id} onClick={() => void toggleRule(rule)}>
                        {rule.enabled ? "Pausar" : "Ativar"}
                      </Button>
                      <Button type="button" variant="ghost" size="icon" aria-label="Remover automação" disabled={deletingId === rule.id} onClick={() => void deleteRule(rule)}>
                        <Trash2 className="text-destructive" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
