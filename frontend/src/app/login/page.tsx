"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

import { apiFetch } from "@/lib/api";
import { LoginResponse } from "@/lib/types";

import styles from "./page.module.css";


export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);


  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setError("");
    setLoading(true);

    try {
      const response = await apiFetch<LoginResponse>(
        '/api/v1/auth/login',
        {
          method: "POST",
          body: JSON.stringify({
            email,
            password,
          }),
        },
      );

      localStorage.setItem(
        "leadflow_token",
        response.access_token,
      );

      router.push("/dashboard");
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Não foi possível fazer login.",
      );
    } finally {
      setLoading(false);
    }
  }


  return (
    <main className={styles.container}>
      <section className={styles.card}>
        <div className={styles.header}>
          <span className={styles.logo}>LeadFlow</span>

          <h1>Entrar</h1>

          <p>
            Acesse seu painel de leads.
          </p>
        </div>

        <form
          className={styles.form}
          onSubmit={handleSubmit}
        >
          <label>
            E-mail

            <input
              type="email"
              value={email}
              onChange={(event) =>
                setEmail(event.target.value)
              }
              required
            />
          </label>

          <label>
            Senha

            <input
              type="password"
              value={password}
              onChange={(event) =>
                setPassword(event.target.value)
              }
              required
            />
          </label>

          {error && (
            <div className={styles.error}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
          >
            {loading ? "Entrando..." : "Entrar"}
          </button>
        </form>
      </section>
    </main>
  );
}
