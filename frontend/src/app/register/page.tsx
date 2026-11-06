"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Zap } from "lucide-react";

import { apiFetch } from "@/lib/api";
import {
  normalizeRegistrationEmail,
  validateRegistration,
} from "@/lib/registration-validation.mjs";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");

    const validationError = validateRegistration(email, password, passwordConfirmation);
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    const normalizedEmail = normalizeRegistrationEmail(email);

    try {
      await apiFetch<{ id: number; email: string }>("/api/v1/auth/register", {
        method: "POST",
        body: JSON.stringify({ email: normalizedEmail, password }),
      });

      try {
        await apiFetch<{ authenticated: boolean }>("/api/v1/auth/login", {
          method: "POST",
          body: JSON.stringify({ email: normalizedEmail, password }),
        });
        router.replace("/dashboard");
      } catch {
        setSuccess("Conta criada. Entre com seu e-mail e senha para continuar.");
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Não foi possível criar a conta.";
      setError(
        message === "Email already registered"
          ? "Este e-mail já está cadastrado. Entre ou use outro endereço."
          : message,
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-svh items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-4 text-center">
          <div className="mx-auto flex size-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Zap className="size-6" aria-hidden="true" />
          </div>
          <div className="space-y-1.5">
            <CardTitle className="text-2xl">Criar conta</CardTitle>
            <CardDescription>Cadastre-se para organizar seus leads no LeadFlow.</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="register-email">E-mail</Label>
              <Input
                id="register-email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="register-password">Senha</Label>
              <Input
                id="register-password"
                type="password"
                autoComplete="new-password"
                minLength={8}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                disabled={loading}
              />
              <p className="text-xs text-muted-foreground">Use pelo menos 8 caracteres.</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="register-password-confirmation">Confirmar senha</Label>
              <Input
                id="register-password-confirmation"
                type="password"
                autoComplete="new-password"
                minLength={8}
                value={passwordConfirmation}
                onChange={(event) => setPasswordConfirmation(event.target.value)}
                required
                disabled={loading}
              />
            </div>
            {error && (
              <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </p>
            )}
            {success && (
              <p role="status" className="rounded-lg border border-emerald-600/30 bg-emerald-600/5 p-3 text-sm text-emerald-700">
                {success} <Link href="/login" className="font-medium underline">Entrar</Link>
              </p>
            )}
            <Button type="submit" className="w-full" size="lg" disabled={loading}>
              {loading ? "Criando conta…" : "Criar conta"}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="justify-center gap-1 border-t bg-transparent text-sm">
          <span className="text-muted-foreground">Já tem uma conta?</span>
          <Link href="/login" className="font-medium text-primary hover:underline">
            Entrar
          </Link>
        </CardFooter>
      </Card>
    </main>
  );
}
