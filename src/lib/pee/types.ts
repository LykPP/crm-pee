/** Domain shapes used by the business rules; they mirror the database rows. */
import type { CallRules } from "@/lib/calls/rules-schema";

export type Stage =
  | "prospecting"
  | "site_visit"
  | "documentation"
  | "diagnosis"
  | "ready"
  | "submitted"
  | "approved"
  | "execution"
  | "mv"
  | "completed"
  | "lost";

export interface Call {
  id: string;
  published_on: string | null;
  submission_deadline: string | null;
  rules: CallRules;
}

export interface ConsumerUnit {
  id: string;
  number: string;
  description?: string | null;
}

export interface ProjectDocument {
  item_key: string;
  consumer_unit_id: string | null;
  status: "pending" | "ok" | "na";
  file_path?: string | null;
  issued_on: string | null;
  valid_until: string | null;
  notes?: string | null;
}

export interface EfficiencyAction {
  end_use: string;
  description?: string | null;
  quantity: number;
  power_before_w: number;
  power_after_w: number;
  hours_per_year: number;
  peak_hours_per_day: number;
  peak_days_per_month: number;
  months_per_year: number;
  useful_life_years: number;
  unit_cost: number;
  energy_saved_mwh_override: number | null;
  peak_reduction_kw_override: number | null;
}

export interface ProjectCosts {
  diagnosis: number;
  executive_design: number;
  management: number;
  final_report: number;
  other_services: number;
  marketing: number;
  training: number;
  disposal: number;
  measurement_verification: number;
  counterpart: number;
}

export interface Project {
  id: string;
  client_id: string;
  name: string;
  call_id: string | null;
  typology: string | null;
  modality: "fp" | "cd";
  voltage_level: string | null;
  municipality: string | null;
  stage: Stage;
  is_micro_small_business: boolean;
  has_non_removable_uses: boolean;
  is_heritage_listed: boolean;
  has_incentivized_source: boolean;
  requires_public_bidding: boolean;
  is_example?: boolean;
}

/** A project with everything the rules need to evaluate it. */
export interface ProjectBundle {
  project: Project;
  call: Call | null;
  units: ConsumerUnit[];
  documents: ProjectDocument[];
  /** Absent when the viewer may not see costs. */
  actions?: EfficiencyAction[];
  costs?: ProjectCosts | null;
}
