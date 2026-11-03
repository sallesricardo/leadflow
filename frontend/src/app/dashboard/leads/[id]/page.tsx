"use client";

import { Suspense, useCallback, useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Pencil, Plus, Save, X } from "lucide-react";
import { toast } from "sonner";

import { apiFetch } from "@/lib/api";
import type { Lead, LeadActivity, LeadStatus } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";

const statusConfig: Record<LeadStatus, { label: string; className: string }> = {
  NEW: { label: "Novo", className: "border-blue-200 bg-blue-50 text-blue-700" },
  CONTACTED: { label: "Contatado", className: "border-sky-200 bg-sky-50 text-sky-700" },
  QUALIFIED: { label: "Qualificado", className: "border-indigo-200 bg-indigo-50 text-indigo-700" },
  PROPOSAL: { label: "Proposta", className: "border-violet-200 bg-violet-50 text-violet-700" },
  NEGOTIATION: { label: "Negociação", className: "border-amber-200 bg-amber-50 text-amber-700" },
  WON: { label: "Ganho", className: "border-emerald-200 bg-emerald-50 text-emerald-700" },
  LOST: { label: "Perdido", className: "border-red-200 bg-red-50 text-red-700" },
};

const activityLabels: Record<LeadActivity["type"], string> = {
  NOTE: "Nota",
  CALL: "Ligação",
  MESSAGE: "Mensagem",
  EMAIL: "E-mail",
  STATUS_CHANGE: "Mudança de etapa",
};

function formatCurrency(value: number | null) {
  if (value === null) return "Não informado";

  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

function formatDate(value: string) {
  return new Date(value).toLocaleString("pt-BR", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function LeadDetailsContent() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const leadId = params.id;

  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [source, setSource] = useState("");
  const [value, setValue] = useState("");
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState<LeadStatus>("NEW");
  const [activityType, setActivityType] = useState<LeadActivity["type"]>("NOTE");
  const [activityContent, setActivityContent] = useState("");
  const [creatingActivity, setCreatingActivity] = useState(false);
  const [saving, setSaving] = useState(false);
  const [lead, setLead] = useState<Lead | null>(null);
  const [activities, setActivities] = useState<LeadActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fillForm = useCallback((data: Lead) => {
    setName(data.name);
    setEmail(data.email ?? "");
    setPhone(data.phone ?? "");
    setSource(data.source ?? "");
    setValue(
      data.value === null
        ? ""
        : data.value.toLocaleString("pt-BR", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          }),
    );
    setNotes(data.notes ?? "");
    setStatus(data.status);
  }, []);

  useEffect(() => {
    const token = localStorage.getItem("leadflow_token");

    if (!token) {
      router.replace("/login");
      return;
    }

    const authToken = token;
    let active = true;

    async function loadLead() {
      try {
        const [leadData, activitiesData] = await Promise.all([
          apiFetch<Lead>(`/api/v1/leads/${leadId}`, { token: authToken }),
          apiFetch<LeadActivity[]>(`/api/v1/leads/${leadId}/activities`, { token: authToken }),
        ]);

        if (!active) return;
        setLead(leadData);
        fillForm(leadData);
        setActivities(activitiesData);
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : "Não foi possível carregar o lead.");
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadLead();
    return () => {
      active = false;
    };
  }, [fillForm, leadId, router]);

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const token = localStorage.getItem("leadflow_token");

    if (!token) {
      router.replace("/login");
      return;
    }

    const normalizedValue = value.replace(/\./g, "").replace(",", ".").trim();
    const numericValue = normalizedValue === "" ? null : Number(normalizedValue);
    if (numericValue !== null && (!Number.isFinite(numericValue) || numericValue < 0)) {
      toast.error("Informe um valor de oportunidade válido.");
      return;
    }

    setSaving(true);
    try {
      const updatedLead = await apiFetch<Lead>(`/api/v1/leads/${leadId}`, {
        method: "PATCH",
        token,
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim() || null,
          phone: phone.trim() || null,
          source: source.trim() || null,
          value: numericValue,
          notes: notes.trim() || null,
          status,
        }),
      });

      setLead(updatedLead);
      fillForm(updatedLead);
      setEditing(false);
      toast.success("Lead atualizado.");

      try {
        setActivities(
          await apiFetch<LeadActivity[]>(`/api/v1/leads/${leadId}/activities`, { token }),
        );
      } catch {
        toast.error("Lead atualizado, mas não foi possível atualizar a timeline.");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível salvar o lead.");
    } finally {
      setSaving(false);
    }
  }

  async function handleCreateActivity(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const content = activityContent.trim();
    if (!content) return;

    const token = localStorage.getItem("leadflow_token");
    if (!token) {
      router.replace("/login");
      return;
    }

    setCreatingActivity(true);
    try {
      const activity = await apiFetch<LeadActivity>(`/api/v1/leads/${leadId}/activities`, {
        method: "POST",
        token,
        body: JSON.stringify({ type: activityType, content }),
      });
      setActivities((current) => [activity, ...current]);
      setActivityContent("");
      setActivityType("NOTE");
      toast.success("Atividade registrada.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível registrar a atividade.");
    } finally {
      setCreatingActivity(false);
    }
  }

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-6xl space-y-6">
        <Skeleton className="h-10 w-56" />
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
          <Skeleton className="h-[28rem] rounded-xl" />
          <Skeleton className="h-[28rem] rounded-xl" />
        </div>
      </div>
    );
  }

  if (error || !lead) {
    return (
      <div className="mx-auto w-full max-w-3xl">
        <Card>
          <CardHeader>
            <CardTitle>Não foi possível abrir este lead</CardTitle>
            <CardDescription>{error || "Lead não encontrado."}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button nativeButton={false} render={<Link href="/dashboard/leads" />}>Voltar para leads</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <Button nativeButton={false} variant="outline" size="icon" render={<Link href="/dashboard/leads" />} aria-label="Voltar para leads">
            <ArrowLeft />
          </Button>
          <div className="min-w-0 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="truncate text-2xl font-semibold tracking-tight">{lead.name}</h1>
              <Badge variant="outline" className={statusConfig[lead.status].className}>
                {statusConfig[lead.status].label}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">Lead #{lead.id} · Criado em {formatDate(lead.created_at)}</p>
          </div>
        </div>

        {!editing && (
          <Button variant="outline" onClick={() => setEditing(true)}>
            <Pencil />
            Editar lead
          </Button>
        )}
      </header>

      <div className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        <Card className="min-w-0">
          <CardHeader className="border-b">
            <CardTitle>Informações do lead</CardTitle>
            <CardDescription>Contato e dados da oportunidade.</CardDescription>
          </CardHeader>
          <CardContent className="pt-5">
            {editing ? (
              <form onSubmit={handleSave} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="lead-name">Nome *</Label>
                  <Input id="lead-name" value={name} onChange={(event) => setName(event.target.value)} required />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="lead-email">E-mail</Label>
                    <Input id="lead-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lead-phone">Telefone</Label>
                    <Input id="lead-phone" value={phone} onChange={(event) => setPhone(event.target.value)} />
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="lead-source">Origem</Label>
                    <Input id="lead-source" value={source} onChange={(event) => setSource(event.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lead-status">Etapa</Label>
                    <select
                      id="lead-status"
                      value={status}
                      onChange={(event) => setStatus(event.target.value as LeadStatus)}
                      className="h-8 w-full rounded-lg border border-input bg-background px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                    >
                      {Object.entries(statusConfig).map(([key, config]) => (
                        <option key={key} value={key}>{config.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lead-value">Valor da oportunidade (R$)</Label>
                  <Input id="lead-value" inputMode="decimal" value={value} onChange={(event) => setValue(event.target.value)} placeholder="0,00" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lead-notes">Observações</Label>
                  <Textarea id="lead-notes" value={notes} onChange={(event) => setNotes(event.target.value)} rows={4} />
                </div>
                <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                  <Button type="button" variant="outline" disabled={saving} onClick={() => { fillForm(lead); setEditing(false); }}>
                    <X /> Cancelar
                  </Button>
                  <Button type="submit" disabled={saving}>
                    <Save /> {saving ? "Salvando…" : "Salvar alterações"}
                  </Button>
                </div>
              </form>
            ) : (
              <dl className="grid gap-x-6 gap-y-5 sm:grid-cols-2">
                <Detail label="E-mail" value={lead.email} />
                <Detail label="Telefone" value={lead.phone} />
                <Detail label="Origem" value={lead.source} />
                <Detail label="Valor da oportunidade" value={formatCurrency(lead.value)} />
                <div className="space-y-1.5 sm:col-span-2">
                  <dt className="text-sm font-medium text-muted-foreground">Observações</dt>
                  <dd className="whitespace-pre-wrap break-words text-sm">{lead.notes || "Nenhuma observação."}</dd>
                </div>
              </dl>
            )}
          </CardContent>
        </Card>

        <Card className="min-w-0">
          <CardHeader className="border-b">
            <CardTitle>Atividades</CardTitle>
            <CardDescription>Histórico de interações e mudanças neste lead.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 pt-5">
            <form onSubmit={handleCreateActivity} className="space-y-3 rounded-lg border bg-muted/20 p-4">
              <div className="grid gap-3 sm:grid-cols-[minmax(0,10rem)_1fr]">
                <div className="space-y-2">
                  <Label htmlFor="activity-type">Tipo</Label>
                  <select
                    id="activity-type"
                    value={activityType}
                    onChange={(event) => setActivityType(event.target.value as LeadActivity["type"])}
                    className="h-8 w-full rounded-lg border border-input bg-background px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                  >
                    <option value="NOTE">Nota</option>
                    <option value="CALL">Ligação</option>
                    <option value="MESSAGE">Mensagem</option>
                    <option value="EMAIL">E-mail</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="activity-content">Descrição</Label>
                  <Textarea id="activity-content" value={activityContent} onChange={(event) => setActivityContent(event.target.value)} placeholder="Descreva a interação com o lead…" rows={2} required />
                </div>
              </div>
              <div className="flex justify-end">
                <Button type="submit" disabled={creatingActivity || !activityContent.trim()}>
                  <Plus /> {creatingActivity ? "Registrando…" : "Registrar atividade"}
                </Button>
              </div>
            </form>

            {activities.length === 0 ? (
              <div className="rounded-lg border border-dashed px-4 py-10 text-center">
                <p className="text-sm font-medium">Nenhuma atividade registrada</p>
                <p className="mt-1 text-sm text-muted-foreground">As interações e mudanças de etapa aparecerão aqui.</p>
              </div>
            ) : (
              <ol className="space-y-5">
                {activities.map((activity) => (
                  <li key={activity.id} className="relative border-l pl-5 last:pb-0">
                    <span className="absolute -left-[5px] top-1.5 size-2.5 rounded-full bg-primary ring-4 ring-background" />
                    <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                      <span className="text-sm font-medium">{activityLabels[activity.type]}</span>
                      <time className="text-xs text-muted-foreground">{formatDate(activity.created_at)}</time>
                    </div>
                    {activity.content && <p className="mt-2 whitespace-pre-wrap break-words text-sm text-muted-foreground">{activity.content}</p>}
                  </li>
                ))}
              </ol>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="min-w-0 space-y-1.5">
      <dt className="text-sm font-medium text-muted-foreground">{label}</dt>
      <dd className="break-words text-sm">{value || "Não informado"}</dd>
    </div>
  );
}

function LeadDetailsSkeleton() {
  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      <Skeleton className="h-10 w-56" />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        <Skeleton className="h-[28rem] rounded-xl" />
        <Skeleton className="h-[28rem] rounded-xl" />
      </div>
    </div>
  );
}

export default function LeadDetailsPage() {
  return (
    <Suspense fallback={<LeadDetailsSkeleton />}>
      <LeadDetailsContent />
    </Suspense>
  );
}
