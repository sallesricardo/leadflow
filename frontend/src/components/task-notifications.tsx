"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, CalendarClock } from "lucide-react";

import { apiFetch } from "@/lib/api";
import type { Task } from "@/lib/types";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const REMINDER_WINDOW_MS = 24 * 60 * 60 * 1000;

function formatDueTime(value: string) {
  return new Date(value).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatReminder(task: Task, now: number) {
  const dueAt = new Date(task.due_at);
  if (dueAt.getTime() <= now) {
    return `Atrasada · ${dueAt.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })} às ${formatDueTime(task.due_at)}`;
  }

  const today = new Date(now);
  const dueDay = new Date(task.due_at);
  const isToday = today.toDateString() === dueDay.toDateString();
  return `${isToday ? "Hoje" : "Amanhã"} às ${formatDueTime(task.due_at)}`;
}

export function TaskNotifications() {
  const pathname = usePathname();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [now, setNow] = useState(0);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const taskData = await apiFetch<Task[]>("/api/v1/tasks");
      setTasks(taskData);
      setNow(Date.now());
      setFailed(false);
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const initialRefresh = window.setTimeout(() => void refresh(), 0);
    const interval = window.setInterval(() => void refresh(), 60_000);
    const onFocus = () => void refresh();
    window.addEventListener("focus", onFocus);

    return () => {
      window.clearTimeout(initialRefresh);
      window.clearInterval(interval);
      window.removeEventListener("focus", onFocus);
    };
  }, [pathname, refresh]);

  const reminders = useMemo(
    () => tasks
      .filter((task) => !task.completed && Date.parse(task.due_at) < now + REMINDER_WINDOW_MS)
      .sort((a, b) => Date.parse(a.due_at) - Date.parse(b.due_at)),
    [now, tasks],
  );
  const overdueCount = reminders.filter((task) => Date.parse(task.due_at) <= now).length;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <button
            type="button"
            className="relative inline-flex size-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label={reminders.length ? `Lembretes: ${reminders.length}` : "Lembretes"}
          />
        }
      >
        <Bell className="size-4" />
        {reminders.length > 0 && (
          <span
            aria-hidden="true"
            className={`absolute -top-1 -right-1 flex min-w-4 items-center justify-center rounded-full px-1 text-[10px] leading-4 text-white ${overdueCount ? "bg-destructive" : "bg-primary"}`}
          >
            {reminders.length > 9 ? "9+" : reminders.length}
          </span>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 max-w-[calc(100vw-2rem)]">
        <DropdownMenuLabel className="px-3 py-2 text-sm">Prazos próximos</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {loading ? (
          <p className="px-3 py-4 text-sm text-muted-foreground">Carregando lembretes…</p>
        ) : failed ? (
          <p className="px-3 py-4 text-sm text-muted-foreground">Não foi possível carregar os lembretes.</p>
        ) : reminders.length === 0 ? (
          <p className="px-3 py-4 text-sm text-muted-foreground">Nenhuma tarefa atrasada ou para as próximas 24 horas.</p>
        ) : (
          <>
            {reminders.slice(0, 5).map((task) => {
              const overdue = Date.parse(task.due_at) <= now;
              return (
                <DropdownMenuItem
                  key={task.id}
                  render={<Link href="/dashboard/tasks" />}
                  className="items-start whitespace-normal px-3 py-2.5"
                >
                  <CalendarClock className={`mt-0.5 size-4 ${overdue ? "text-destructive" : "text-muted-foreground"}`} />
                  <span className="grid min-w-0 gap-0.5">
                    <span className="truncate font-medium">{task.title}</span>
                    <span className="truncate text-xs text-muted-foreground">{task.lead_name} · {formatReminder(task, now)}</span>
                  </span>
                </DropdownMenuItem>
              );
            })}
            {reminders.length > 5 && (
              <p className="px-3 py-2 text-xs text-muted-foreground">E mais {reminders.length - 5} tarefa(s).</p>
            )}
          </>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem render={<Link href="/dashboard/tasks" />} className="justify-center py-2 font-medium text-primary">
          Ver todas as tarefas
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
