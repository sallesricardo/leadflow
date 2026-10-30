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
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
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
