"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { apiFetch } from "@/lib/api";
import { Lead, LeadStatus } from "@/lib/types";

import styles from "./page.module.css";


const columns: {
  status: LeadStatus;
  label: string;
}[] = [
  { status: "NEW", label: "Novos" },
  { status: "CONTACTED", label: "Contato" },
  { status: "QUALIFIED", label: "Qualificados" },
  { status: "PROPOSAL", label: "Proposta" },
  { status: "NEGOTIATION", label: "Negociação" },
  { status: "WON", label: "Fechados" },
  { status: "LOST", label: "Perdidos" },
];


export default function DashboardPage() {
  const router = useRouter();

  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");


  useEffect(() => {
    const token =
      localStorage.getItem("leadflow_token");

    if (!token) {
      router.replace("/login");
      return;
    }

    async function loadLeads() {
      try {
        const data = await apiFetch<Lead[]>(
          "/api/v1/leads",
          { token },
        );

        setLeads(data);
      } catch (error) {
        if (
          error instanceof Error &&
          error.message.toLowerCase().includes("token")
        ) {
          localStorage.removeItem(
            "leadflow_token",
          );

          router.replace("/login");
          return;
        }

        setError(
          error instanceof Error
            ? error.message
            : "Erro ao carregar leads.",
        );
      } finally {
        setLoading(false);
      }
    }

    loadLeads();
  }, [router]);


  const leadsByStatus = useMemo(() => {
    return columns.reduce(
      (result, column) => {
        result[column.status] = leads.filter(
          (lead) =>
            lead.status === column.status,
        );

        return result;
      },
      {} as Record<LeadStatus, Lead[]>,
    );
  }, [leads]);


  function logout() {
    localStorage.removeItem(
      "leadflow_token",
    );

    router.replace("/login");
  }


  if (loading) {
    return (
      <main className={styles.loading}>
        Carregando...
      </main>
    );
  }


  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div>
          <span className={styles.logo}>
            LeadFlow
          </span>

          <h1>Pipeline</h1>

          <p>
            Acompanhe suas oportunidades de venda.
          </p>
        </div>

        <button
          className={styles.logout}
          onClick={logout}
        >
          Sair
        </button>
      </header>


      {error && (
        <div className={styles.error}>
          {error}
        </div>
      )}


      <section className={styles.board}>
        {columns.map((column) => {
          const columnLeads =
            leadsByStatus[column.status] ?? [];

          return (
            <div
              className={styles.column}
              key={column.status}
            >
              <div className={styles.columnHeader}>
                <h2>{column.label}</h2>

                <span>
                  {columnLeads.length}
                </span>
              </div>

              <div className={styles.cards}>
                {columnLeads.map((lead) => (
                  <article
                    className={styles.card}
                    key={lead.id}
                  >
                    <h3>{lead.name}</h3>

                    {lead.source && (
                      <span
                        className={styles.source}
                      >
                        {lead.source}
                      </span>
                    )}

                    {lead.email && (
                      <p>{lead.email}</p>
                    )}

                    {lead.phone && (
                      <p>{lead.phone}</p>
                    )}
                  </article>
                ))}

                {columnLeads.length === 0 && (
                  <div className={styles.empty}>
                    Nenhum lead
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </section>
    </main>
  );
}
