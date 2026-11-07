import { AppSidebar } from "@/components/app-sidebar";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { TaskNotifications } from "@/components/task-notifications";

interface LayoutProps {
  children: React.ReactNode;
}

export default function DashboardLayout({
  children,
}: LayoutProps) {
  return (
    <SidebarProvider>
      <AppSidebar />

      <SidebarInset className="min-w-0 overflow-x-hidden">
        <header className="flex h-16 shrink-0 items-center gap-2 border-b">
          <div className="flex items-center gap-2 px-4">
            <SidebarTrigger />

            <Separator
              orientation="vertical"
              className="mr-2 h-4"
            />

            <div className="text-sm font-medium">
              LeadFlow
            </div>
          </div>

          <div className="ml-auto px-4">
            <TaskNotifications />
          </div>
        </header>

        <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-4 overflow-x-hidden p-4 md:p-6">
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
