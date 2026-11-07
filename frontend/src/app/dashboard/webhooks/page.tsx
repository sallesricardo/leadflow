"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Check, Copy, Pause, Play, Plus, RefreshCw, RotateCcw, Trash2, Webhook as WebhookIcon } from "lucide-react";
import { toast } from "sonner";

import { apiFetch } from "@/lib/api";
import type {
  WebhookCreated,
  WebhookDelivery,
  WebhookEndpoint,
  WebhookEvent,
} from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const EVENT_OPTIONS: { value: WebhookEvent; label: string; description: string }[] = [
  { value: "lead.created", label: "Lead criado", description: "Quando um lead é cadastrado." },
  { value: "lead.updated", label: "Lead atualizado", description: "Quando dados do lead são alterados." },
  { value: "lead.status_changed", label: "Etapa alterada", description: "Quando o lead muda de etapa." },
  { value: "task.created", label: "Tarefa criada", description: "Quando uma tarefa é adicionada a um lead." },
  { value: "task.completed", label: "Tarefa concluída", description: "Quando uma tarefa é marcada como concluída." },
  { value: "task.reopened", label: "Tarefa reaberta", description: "Quando uma tarefa concluída volta a ficar aberta." },
];

function eventLabel(event: WebhookEvent) {
  return EVENT_OPTIONS.find((option) => option.value === event)?.label ?? event;
}

function formatDate(value: string) {
  return new Date(value).toLocaleString("pt-BR", { dateStyle: "medium", timeStyle: "short" });
}

function deliveryStatus(status: WebhookDelivery["status"]) {
  switch (status) {
    case "delivered": return { label: "Entregue", variant: "default" as const };
    case "failed": return { label: "Falhou", variant: "destructive" as const };
    case "processing": return { label: "Enviando", variant: "secondary" as const };
    default: return { label: "Pendente", variant: "outline" as const };
  }
}

export default function WebhooksPage() {
  const [endpoints, setEndpoints] = useState<WebhookEndpoint[]>([]);
  const [deliveries, setDeliveries] = useState<WebhookDelivery[]>([]);
  const [deliveriesEndpointId, setDeliveriesEndpointId] = useState<number | null>(null);
  const [deliveriesError, setDeliveriesError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [url, setUrl] = useState("");
  const [events, setEvents] = useState<WebhookEvent[]>(["lead.created", "lead.status_changed"]);
  const [createdSecret, setCreatedSecret] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshVersion, setRefreshVersion] = useState(0);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [retryingId, setRetryingId] = useState<number | null>(null);

  useEffect(() => {
    let active = true;
    apiFetch<WebhookEndpoint[]>("/api/v1/webhooks")
      .then((data) => {
        if (!active) return;
        setEndpoints(data);
        setSelectedId((current) => current && data.some((endpoint) => endpoint.id === current)
          ? current
          : data[0]?.id ?? null);
      })
      .catch((error: Error) => {
        if (active) toast.error(error.message || "Não foi possível carregar os webhooks.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (selectedId === null) return;
    let active = true;
    apiFetch<WebhookDelivery[]>(`/api/v1/webhooks/${selectedId}/deliveries`)
      .then((data) => {
        if (!active) return;
        setDeliveries(data);
        setDeliveriesEndpointId(selectedId);
        setDeliveriesError(null);
      })
      .catch((error: Error) => {
        if (!active) return;
        setDeliveries([]);
        setDeliveriesEndpointId(selectedId);
        setDeliveriesError(error.message || "Não foi possível carregar as entregas.");
      });
    return () => { active = false; };
  }, [selectedId, refreshVersion]);

  const loadingDeliveries = selectedId !== null && deliveriesEndpointId !== selectedId;

  function toggleEvent(event: WebhookEvent) {
    setEvents((current) => current.includes(event)
      ? current.filter((item) => item !== event)
      : [...current, event]);
  }

  async function createWebhook(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!events.length) {
      toast.error("Selecione pelo menos um evento.");
      return;
    }
    if (!url.trim().startsWith("https://")) {
      toast.error("Informe uma URL HTTPS.");
      return;
    }

    setSaving(true);
    try {
      const created = await apiFetch<WebhookCreated>("/api/v1/webhooks", {
        method: "POST",
        body: JSON.stringify({ url: url.trim(), events }),
      });
      setCreatedSecret(created.secret);
      setUrl("");
      const data = await apiFetch<WebhookEndpoint[]>("/api/v1/webhooks");
      setEndpoints(data);
      setSelectedId(created.id);
      toast.success("Webhook cadastrado.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível cadastrar o webhook.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteWebhook(endpoint: WebhookEndpoint) {
    if (!window.confirm(`Remover o webhook ${endpoint.url}? As entregas pendentes também serão removidas.`)) return;
    setDeletingId(endpoint.id);
    try {
      await apiFetch<void>(`/api/v1/webhooks/${endpoint.id}`, { method: "DELETE" });
      setEndpoints((current) => current.filter((item) => item.id !== endpoint.id));
      setSelectedId((current) => current === endpoint.id
        ? endpoints.find((item) => item.id !== endpoint.id)?.id ?? null
        : current);
      if (selectedId === endpoint.id) setDeliveriesEndpointId(null);
      setCreatedSecret(null);
      toast.success("Webhook removido.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível remover o webhook.");
    } finally {
      setDeletingId(null);
    }
  }

  async function toggleWebhook(endpoint: WebhookEndpoint) {
    setUpdatingId(endpoint.id);
    try {
      const updated = await apiFetch<WebhookEndpoint>(`/api/v1/webhooks/${endpoint.id}`, {
        method: "PATCH",
        body: JSON.stringify({ enabled: !endpoint.enabled }),
      });
      setEndpoints((current) => current.map((item) => item.id === updated.id ? updated : item));
      toast.success(updated.enabled ? "Webhook reativado." : "Webhook pausado.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível atualizar o webhook.");
    } finally {
      setUpdatingId(null);
    }
  }

  async function retryDelivery(endpointId: number, deliveryId: number) {
    setRetryingId(deliveryId);
    try {
      const updated = await apiFetch<WebhookDelivery>(
        `/api/v1/webhooks/${endpointId}/deliveries/${deliveryId}/retry`,
        { method: "POST" },
      );
      setDeliveries((current) => current.map((item) => item.id === updated.id ? updated : item));
      toast.success("Entrega reenfileirada.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível reenviar a entrega.");
    } finally {
      setRetryingId(null);
    }
  }

  async function copySecret() {
    if (!createdSecret) return;
    try {
      await navigator.clipboard.writeText(createdSecret);
      toast.success("Segredo copiado.");
    } catch {
      toast.error("Não foi possível copiar. Selecione e copie o segredo manualmente.");
    }
  }

  function refreshSelectedDeliveries() {
    setDeliveriesEndpointId(null);
    setDeliveriesError(null);
    setRefreshVersion((current) => current + 1);
  }

  const selectedEndpoint = endpoints.find((endpoint) => endpoint.id === selectedId) ?? null;

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Webhooks</h1>
        <p className="text-sm text-muted-foreground">Envie eventos de leads para seus sistemas e acompanhe as entregas.</p>
      </div>

      <p className="rounded-lg border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
        As entregas são processadas pelo worker de webhooks do backend. Sem o worker ativo, os eventos ficam pendentes na fila.
      </p>

      <Card>
        <CardHeader>
          <CardTitle>Novo destino</CardTitle>
          <CardDescription>O destino deve aceitar requisições HTTPS com payload JSON.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={createWebhook} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="webhook-url">URL HTTPS</Label>
              <Input id="webhook-url" type="url" inputMode="url" autoComplete="url" placeholder="https://exemplo.com/webhooks/leadflow" value={url} onChange={(event) => setUrl(event.target.value)} required />
            </div>
            <fieldset className="space-y-3">
              <legend className="text-sm font-medium">Eventos</legend>
              <div className="grid gap-3 md:grid-cols-3">
                {EVENT_OPTIONS.map((option) => (
                  <label key={option.value} className="flex cursor-pointer items-start gap-3 rounded-lg border p-3">
                    <input type="checkbox" checked={events.includes(option.value)} onChange={() => toggleEvent(option.value)} className="mt-1 accent-primary" />
                    <span className="space-y-0.5">
                      <span className="block text-sm font-medium">{option.label}</span>
                      <span className="block text-xs text-muted-foreground">{option.description}</span>
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>
            <Button type="submit" disabled={saving}>
              <Plus /> {saving ? "Cadastrando…" : "Cadastrar webhook"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {createdSecret && (
        <Card className="border-primary/40">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Check className="size-4 text-emerald-600" /> Guarde o segredo de assinatura</CardTitle>
            <CardDescription>Ele é exibido somente nesta criação. Use-o para validar o cabeçalho X-LeadFlow-Signature no seu sistema.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 sm:flex-row">
            <code className="min-w-0 flex-1 break-all rounded-md bg-muted p-3 text-xs">{createdSecret}</code>
            <Button type="button" variant="outline" onClick={copySecret}><Copy /> Copiar</Button>
            <Button type="button" variant="ghost" onClick={() => setCreatedSecret(null)}>Fechar</Button>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <section className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold">Destinos cadastrados</h2>
            <Badge variant="secondary">{endpoints.length}</Badge>
          </div>
          {loading ? <p className="text-sm text-muted-foreground">Carregando destinos…</p> : endpoints.length === 0 ? (
            <div className="rounded-lg border border-dashed p-8 text-center">
              <WebhookIcon className="mx-auto mb-3 size-6 text-muted-foreground" />
              <p className="text-sm font-medium">Nenhum webhook cadastrado</p>
              <p className="mt-1 text-sm text-muted-foreground">Cadastre um destino para começar a receber eventos.</p>
            </div>
          ) : (
            <ul className="space-y-3">
              {endpoints.map((endpoint) => (
                <li key={endpoint.id}>
                  <Card className={selectedId === endpoint.id ? "ring-2 ring-primary/40" : undefined}>
                    <CardContent className="space-y-3 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <button type="button" onClick={() => setSelectedId(endpoint.id)} className="min-w-0 flex-1 text-left">
                          <span className="block break-all text-sm font-medium">{endpoint.url}</span>
                          <span className="mt-1 block text-xs text-muted-foreground">Adicionado em {formatDate(endpoint.created_at)}</span>
                        </button>
                        <div className="flex shrink-0 items-center gap-1">
                          <Badge variant={endpoint.enabled ? "secondary" : "outline"}>{endpoint.enabled ? "Ativo" : "Pausado"}</Badge>
                          <Button type="button" variant="ghost" size="icon" aria-label={endpoint.enabled ? "Pausar webhook" : "Reativar webhook"} disabled={updatingId === endpoint.id} onClick={() => void toggleWebhook(endpoint)}>
                            {endpoint.enabled ? <Pause /> : <Play />}
                          </Button>
                          <Button type="button" variant="ghost" size="icon" aria-label="Remover webhook" disabled={deletingId === endpoint.id} onClick={() => void deleteWebhook(endpoint)}>
                            <Trash2 className="text-destructive" />
                          </Button>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {endpoint.events.map((event) => <Badge key={event} variant="outline">{eventLabel(event)}</Badge>)}
                      </div>
                    </CardContent>
                  </Card>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">Entregas recentes</h2>
              <p className="text-xs text-muted-foreground">{selectedEndpoint?.url ?? "Selecione um destino"}</p>
            </div>
            <Button type="button" variant="outline" size="sm" disabled={!selectedId || loadingDeliveries} onClick={refreshSelectedDeliveries}>
              <RefreshCw className={loadingDeliveries ? "animate-spin" : undefined} /> Atualizar
            </Button>
          </div>
          {!selectedId ? (
            <p className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">Cadastre ou selecione um destino para ver as entregas.</p>
          ) : loadingDeliveries ? (
            <p className="text-sm text-muted-foreground">Carregando entregas…</p>
          ) : deliveriesError ? (
            <p role="alert" className="rounded-lg border border-destructive/30 p-4 text-sm text-destructive">{deliveriesError}</p>
          ) : deliveries.length === 0 ? (
            <p className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">Ainda não há eventos para este destino.</p>
          ) : (
            <ul className="space-y-3">
              {deliveries.map((delivery) => {
                const status = deliveryStatus(delivery.status);
                return (
                  <li key={delivery.id}>
                    <Card>
                      <CardContent className="space-y-2 p-4">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <Badge variant="outline">{eventLabel(delivery.event_type)}</Badge>
                          <Badge variant={status.variant}>{status.label}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">{formatDate(delivery.created_at)} · tentativa {delivery.attempt_count}{delivery.last_status_code ? ` · HTTP ${delivery.last_status_code}` : ""}</p>
                        {delivery.last_error && <p className="break-words text-xs text-destructive">{delivery.last_error}</p>}
                        {delivery.status === "failed" && (
                          <Button type="button" variant="outline" size="sm" disabled={!selectedEndpoint?.enabled || retryingId === delivery.id} onClick={() => void retryDelivery(deliveriesEndpointId!, delivery.id)}>
                            <RotateCcw /> {retryingId === delivery.id ? "Reenfileirando…" : "Reenviar"}
                          </Button>
                        )}
                      </CardContent>
                    </Card>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
