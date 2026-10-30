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

  const [lead, setLead] = useState<Lead | null>(null);
  const [activities, setActivities] = useState<LeadActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("leadflow_token");

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
          apiFetch<LeadActivity[]>(
            `/api/v1/leads/${leadId}/activities`,
            {
              token,
            }
          ),
        ]);

        setLead(leadData);
        setActivities(activitiesData);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Não foi possível carregar o lead."
        );
      } finally {
        setLoading(false);
      }
    }

    loadLead();
  }, [leadId, router]);

  if (loading) {
    return <main className={styles.container}>Carregando...</main>;
  }

  if (error || !lead) {
    return (
      <main className={styles.container}>
        <p>{error || "Lead não encontrado."}</p>

        <button onClick={() => router.push("/dashboard")}>
          Voltar
        </button>
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
          <h2>Informações</h2>

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
        </div>

        <div className={styles.card}>
          <h2>Atividades</h2>

          {activities.length === 0 ? (
            <p className={styles.empty}>
              Nenhuma atividade registrada.
            </p>
          ) : (
            <div className={styles.timeline}>
              {activities.map((activity) => (
                <article
                  key={activity.id}
                  className={styles.activity}
                >
                  <div className={styles.activityHeader}>
                    <strong>{activity.type}</strong>

                    <time>
                      {new Date(
                        activity.created_at
                      ).toLocaleString("pt-BR")}
                    </time>
                  </div>

                  {activity.content && (
                    <p>{activity.content}</p>
                  )}
                </article>
              ))}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
