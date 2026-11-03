
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Save } from "lucide-react";
import { toast } from "sonner";

import { apiFetch } from "@/lib/api";
import type { Lead } from "@/lib/types";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

export default function NewLeadPage() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [source, setSource] = useState("");
  const [value, setValue] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!name.trim()) {
      toast.error("Informe o nome do lead.");
      return;
    }

    const normalizedValue = value
      .replace(/\./g, "")
      .replace(",", ".");

    const numericValue =
      normalizedValue.trim() === "" ? null : Number(normalizedValue);

    if (
      numericValue !== null &&
      (!Number.isFinite(numericValue) || numericValue < 0)
    ) {
      toast.error("Informe um valor monetário válido.");
      return;
    }

    setLoading(true);

    try {
      const lead = await apiFetch<Lead>("/api/v1/leads", {
        method: "POST",
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim() || null,
          phone: phone.trim() || null,
          source: source.trim() || null,
          status: "NEW",
          value: numericValue,
          notes: notes.trim() || null,
        }),
      });

      toast.success("Lead criado com sucesso!");
      router.push(`/dashboard/leads/${lead.id}`);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Erro ao criar lead.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      <div className="flex items-center gap-3">
        <Button
          nativeButton={false}
          variant="ghost"
          size="icon"
          render={<Link href="/dashboard/leads" />}
          aria-label="Voltar para leads"
        >
            <ArrowLeft className="size-4" />
        </Button>

        <div>
          <h1 className="text-2xl font-bold">Novo lead</h1>
          <p className="text-sm text-muted-foreground">
            Cadastre uma nova oportunidade comercial.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <section className="space-y-4 rounded-lg border bg-card p-5">
          <h2 className="font-semibold">Informações do contato</h2>

          <div className="space-y-2">
            <Label htmlFor="name">Nome *</Label>
            <Input
              id="name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Nome do contato"
              required
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="contato@empresa.com"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Telefone</Label>
              <Input
                id="phone"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                placeholder="(11) 99999-9999"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="source">Origem</Label>
            <Input
              id="source"
              value={source}
              onChange={(event) => setSource(event.target.value)}
              placeholder="Instagram, indicação, site..."
            />
          </div>
        </section>

        <section className="space-y-4 rounded-lg border bg-card p-5">
          <h2 className="font-semibold">Oportunidade comercial</h2>

          <div className="space-y-2">
            <Label htmlFor="value">Valor estimado (R$)</Label>
            <Input
              id="value"
              value={value}
              onChange={(event) => setValue(event.target.value)}
              placeholder="0,00"
              inputMode="decimal"
            />
            <p className="text-xs text-muted-foreground">
              Valor estimado da oportunidade. Pode ser preenchido posteriormente.
            </p>
          </div>
        </section>

        <section className="space-y-4 rounded-lg border bg-card p-5">
          <h2 className="font-semibold">Observações</h2>

          <div className="space-y-2">
            <Label htmlFor="notes">Anotações</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Informações adicionais sobre o lead..."
              rows={4}
            />
          </div>
        </section>

        <div className="flex justify-end gap-3">
          <Button
            nativeButton={false}
            variant="outline"
            render={<Link href="/dashboard/leads" />}
          >
            Cancelar
          </Button>

          <Button type="submit" disabled={loading}>
            <Save className="mr-2 size-4" />
            {loading ? "Salvando..." : "Criar lead"}
          </Button>
        </div>
      </form>
    </div>
  );
}

