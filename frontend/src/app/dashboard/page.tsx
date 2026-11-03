import { LeadKanban } from "@/components/lead-kanban";
import { DashboardMetrics } from "@/components/dashboard-metrics";

export default function DashboardPage() {
  return (
    <div className="space-y-8">
      <DashboardMetrics />
      <LeadKanban />
    </div>
  );
}

