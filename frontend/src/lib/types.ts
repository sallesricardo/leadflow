export type LeadStatus =
  | "NEW"
  | "CONTACTED"
  | "QUALIFIED"
  | "PROPOSAL"
  | "NEGOTIATION"
  | "WON"
  | "LOST";

export interface Lead {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  source: string | null;
  status: LeadStatus;
  value: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export type ActivityType =
  | "NOTE"
  | "CALL"
  | "MESSAGE"
  | "EMAIL"
  | "STATUS_CHANGE";

export interface LeadActivity {
  id: number;
  lead_id: number;
  user_id: number;
  type: ActivityType;
  content: string | null;
  created_at: string;
}

export interface Task {
  id: number;
  lead_id: number;
  lead_name: string;
  title: string;
  description: string | null;
  due_at: string;
  completed: boolean;
  created_at: string;
}

export type WebhookEvent =
  | "lead.created"
  | "lead.updated"
  | "lead.status_changed"
  | "task.created"
  | "task.completed"
  | "task.reopened";

export interface WebhookEndpoint {
  id: number;
  url: string;
  events: WebhookEvent[];
  enabled: boolean;
  has_auth_token: boolean;
  created_at: string;
}

export interface WebhookCreated extends WebhookEndpoint {
  secret: string;
}

export interface WebhookDelivery {
  id: number;
  event_id: string;
  event_type: WebhookEvent;
  status: "pending" | "processing" | "delivered" | "failed";
  attempt_count: number;
  last_status_code: number | null;
  last_error: string | null;
  delivered_at: string | null;
  created_at: string;
}

export interface WebhookDeliverySummary {
  pending: number;
  processing: number;
  delivered: number;
  failed: number;
  total: number;
  oldest_pending_at: string | null;
  latest_delivery_at: string | null;
}

export interface AutomationRule {
  id: number;
  name: string;
  trigger_status: LeadStatus;
  task_title: string;
  task_description: string | null;
  due_in_days: number;
  enabled: boolean;
  created_at: string;
}
