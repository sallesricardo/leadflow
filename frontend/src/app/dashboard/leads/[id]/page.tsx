"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import { apiFetch } from "@/lib/api";
import { Lead, LeadActivity } from "@/lib/types";

import styles from "./page.module.css";

export default function LeadDetailsPage() {
  const params = useParams();
  const router = useRouter();

  const leadId = params.id as string;

  const [editing, setEditing] = useState(false);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [source, setSource] = useState("");
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState<Lead["status"]>("NEW");

  const [saving, setSaving] = useState(false);

  const [lead, setLead] = useState<Lead | null>(null);
  const [activities, setActivities] = useState<LeadActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("leadflow_token") ?? undefined;

    if (!token) {
      router.push("/login");
      return;
    }

    async function loadLead() {
      try {
        const [leadData, activitiesData] = await Promise.all([
          apiFetch<Lead>(`/api/v1/leads/${leadId}`, {
            token,
          }),
          apiFetch<LeadActivity[]>(`/api/v1/leads/${leadId}/activities`, {
            token,
          }),
        ]);

        setLead(leadData);
        setName(leadData.name);
        setEmail(leadData.email ?? "");
        setPhone(leadData.phone ?? "");
        setSource(leadData.source ?? "");
        setNotes(leadData.notes ?? "");
        setStatus(leadData.status);

        setActivities(activitiesData);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Não foi possível carregar o lead.",
        );
      } finally {
        setLoading(false);
      }
    }

    loadLead();
  }, [leadId, router]);

  async function handleSave() {
    const token = localStorage.getItem("leadflow_token");

    if (!token) {
      router.push("/login");
      return;
    }

    setSaving(true);

    try {
      const updatedLead = await apiFetch<Lead>(`/api/v1/leads/${leadId}`, {
        method: "PATCH",
        token,
        body: JSON.stringify({
          name,
          email: email || null,
          phone: phone || null,
          source: source || null,
          notes: notes || null,
          status,
        }),
      });

      setLead(updatedLead);
      setEditing(false);

      const updatedActivities = await apiFetch<LeadActivity[]>(
        `/api/v1/leads/${leadId}/activities`,
        { token },
      );

      setActivities(updatedActivities);
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Não foi possível salvar o lead.",
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <main className={styles.container}>Carregando...</main>;
  }

  if (error || !lead) {
    return (
      <main className={styles.container}>
        <p>{error || "Lead não encontrado."}</p>

        <button onClick={() => router.push("/dashboard")}>Voltar</button>
      </main>
    );
  }

  return (
    <main className={styles.container}>
      <header className={styles.header}>
        <button
          className={styles.backButton}
          onClick={() => router.push("/dashboard")}
        >
          ← Voltar
        </button>

        <div>
          <h1>{lead.name}</h1>
          <p>Lead #{lead.id}</p>
        </div>
      </header>

      <section className={styles.content}>
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <h2>Informações</h2>

            {!editing && (
              <button onClick={() => setEditing(true)}>Editar</button>
            )}
          </div>

          {editing ? (
            <div className={styles.form}>
              <label>
                Nome
                <input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                />
              </label>

              <label>
                Email
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                />
              </label>

              <label>
                Telefone
                <input
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                />
              </label>

              <label>
                Origem
                <input
                  value={source}
                  onChange={(event) => setSource(event.target.value)}
                />
              </label>

              <label>
                Status
                <select
                  value={status}
                  onChange={(event) =>
                    setStatus(event.target.value as Lead["status"])
                  }
                >
                  <option value="NEW">Novo</option>
                  <option value="CONTACTED">Contatado</option>
                  <option value="QUALIFIED">Qualificado</option>
                  <option value="PROPOSAL">Proposta</option>
                  <option value="NEGOTIATION">Negociação</option>
                  <option value="WON">Ganho</option>
                  <option value="LOST">Perdido</option>
                </select>
              </label>

              <label>
                Observações
                <textarea
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  rows={5}
                />
              </label>

              <div className={styles.formActions}>
                <button onClick={() => setEditing(false)} disabled={saving}>
                  Cancelar
                </button>

                <button onClick={handleSave} disabled={saving}>
                  {saving ? "Salvando..." : "Salvar"}
                </button>
              </div>
            </div>
          ) : (
            <dl className={styles.details}>
              <div>
                <dt>Status</dt>
                <dd>{lead.status}</dd>
              </div>

              <div>
                <dt>Email</dt>
                <dd>{lead.email || "Não informado"}</dd>
              </div>

              <div>
                <dt>Telefone</dt>
                <dd>{lead.phone || "Não informado"}</dd>
              </div>

              <div>
                <dt>Origem</dt>
                <dd>{lead.source || "Não informado"}</dd>
              </div>

              <div>
                <dt>Observações</dt>
                <dd>{lead.notes || "Nenhuma observação."}</dd>
              </div>
            </dl>
          )}
        </div>
      </section>
    </main>
  );
}
