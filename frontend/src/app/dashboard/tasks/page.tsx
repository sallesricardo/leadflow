"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { CalendarClock, Check, Circle, Plus } from "lucide-react";
import { toast } from "sonner";

import { apiFetch } from "@/lib/api";
import type { Lead, Task } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

function localDateTimeValue(date: Date) {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

function formatDueDate(value: string) {
  return new Date(value).toLocaleString("pt-BR", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [now, setNow] = useState(0);
  const [title, setTitle] = useState("");
  const [leadId, setLeadId] = useState("");
  const [description, setDescription] = useState("");
  const [dueAt, setDueAt] = useState("");

  const refreshData = useCallback(async () => {
    const [taskData, leadData] = await Promise.all([
      apiFetch<Task[]>("/api/v1/tasks"),
      apiFetch<Lead[]>("/api/v1/leads"),
    ]);
    const initialDueAt = localDateTimeValue(new Date(Date.now() + 60 * 60 * 1000));
    setTasks(taskData);
    setLeads(leadData);
    setLeadId((current) => current || String(leadData[0]?.id ?? ""));
    setDueAt((current) => current || initialDueAt);
    setNow(Date.now());
  }, []);

  useEffect(() => {
    Promise.all([
      apiFetch<Task[]>("/api/v1/tasks"),
      apiFetch<Lead[]>("/api/v1/leads"),
    ])
      .then(([taskData, leadData]) => {
        const initialDueAt = localDateTimeValue(new Date(Date.now() + 60 * 60 * 1000));
        setTasks(taskData);
        setLeads(leadData);
        setLeadId(String(leadData[0]?.id ?? ""));
        setDueAt(initialDueAt);
        setNow(Date.now());
      })
      .catch((error: Error) => toast.error(error.message || "Não foi possível carregar as tarefas."))
      .finally(() => setLoading(false));
  }, []);

  async function createTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!leadId || !dueAt) return;
    setSaving(true);
    try {
      await apiFetch<Task>("/api/v1/tasks", {
        method: "POST",
        body: JSON.stringify({
          lead_id: Number(leadId),
          title: title.trim(),
          description: description.trim() || null,
          due_at: new Date(dueAt).toISOString(),
        }),
      });
      setTitle("");
      setDescription("");
      setDueAt(localDateTimeValue(new Date(Date.now() + 60 * 60 * 1000)));
      await refreshData();
      toast.success("Tarefa criada.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível criar a tarefa.");
    } finally {
      setSaving(false);
    }
  }

  async function toggleTask(task: Task) {
    try {
      const updated = await apiFetch<Task>(`/api/v1/tasks/${task.id}`, {
        method: "PATCH",
        body: JSON.stringify({ completed: !task.completed }),
      });
      setTasks((current) => current.map((item) => item.id === updated.id ? updated : item)
        .sort((a, b) => Number(a.completed) - Number(b.completed) || Date.parse(a.due_at) - Date.parse(b.due_at)));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível atualizar a tarefa.");
    }
  }

  const openTasks = tasks.filter((task) => !task.completed);
  const completedTasks = tasks.filter((task) => task.completed);

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Tarefas e lembretes</h1>
        <p className="text-sm text-muted-foreground">Organize os próximos contatos com seus leads.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Nova tarefa</CardTitle>
          <CardDescription>Defina o próximo passo e quando ele deve acontecer.</CardDescription>
        </CardHeader>
        <CardContent>
          {leads.length === 0 && !loading ? (
            <p className="text-sm text-muted-foreground">Cadastre um lead antes de criar uma tarefa.</p>
          ) : (
            <form onSubmit={createTask} className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="task-title">Tarefa</Label>
                <Input id="task-title" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Ex.: Retornar com a proposta" maxLength={160} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="task-lead">Lead</Label>
                <select id="task-lead" value={leadId} onChange={(event) => setLeadId(event.target.value)} className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm" required>
                  {leads.map((lead) => <option key={lead.id} value={lead.id}>{lead.name}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="task-due">Prazo</Label>
                <Input id="task-due" type="datetime-local" value={dueAt} onChange={(event) => setDueAt(event.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="task-description">Observações</Label>
                <Textarea id="task-description" value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Detalhes opcionais" rows={2} />
              </div>
              <div className="md:col-span-2">
                <Button type="submit" disabled={saving || loading || !leadId}>
                  <Plus /> {saving ? "Salvando…" : "Adicionar tarefa"}
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>

      {loading ? <p className="text-sm text-muted-foreground">Carregando tarefas…</p> : (
        <div className="grid gap-6 lg:grid-cols-2">
          <TaskList title={`A fazer (${openTasks.length})`} tasks={openTasks} now={now} onToggle={toggleTask} />
          <TaskList title={`Concluídas (${completedTasks.length})`} tasks={completedTasks} now={now} onToggle={toggleTask} />
        </div>
      )}
    </div>
  );
}

function TaskList({ title, tasks, now, onToggle }: { title: string; tasks: Task[]; now: number; onToggle: (task: Task) => void }) {
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold">{title}</h2>
      {tasks.length === 0 ? <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">Nenhuma tarefa nesta lista.</p> : (
        <ul className="space-y-3">
          {tasks.map((task) => {
            const overdue = !task.completed && Date.parse(task.due_at) < now;
            return (
              <li key={task.id}>
                <Card className={task.completed ? "opacity-70" : undefined}>
                  <CardContent className="flex items-start gap-3 p-4">
                    <Button variant="ghost" size="icon" aria-label={task.completed ? "Reabrir tarefa" : "Concluir tarefa"} onClick={() => onToggle(task)}>
                      {task.completed ? <Check className="text-emerald-600" /> : <Circle />}
                    </Button>
                    <div className="min-w-0 flex-1 space-y-2">
                      <p className={`break-words font-medium ${task.completed ? "line-through" : ""}`}>{task.title}</p>
                      <Link href={`/dashboard/leads/${task.lead_id}`} className="text-sm text-primary hover:underline">{task.lead_name}</Link>
                      {task.description && <p className="whitespace-pre-wrap break-words text-sm text-muted-foreground">{task.description}</p>}
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant={overdue ? "destructive" : "secondary"}>
                          <CalendarClock /> {overdue ? "Atrasada · " : ""}{formatDueDate(task.due_at)}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
