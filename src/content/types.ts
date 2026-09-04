export type EvidenceStatus =
  | "confirmed"
  | "partial"
  | "product-convention"
  | "user-actual"
  | "unsupported";

export type EffectiveStatus = "published" | "not-published" | "variable";

export interface OfficialSource {
  id: string;
  title: string;
  url: string;
  sourceType: "policy" | "help-center" | "program-terms";
  section?: string;
  officialUpdatedAt?: string;
  verifiedAt: string;
  effectiveStatus: EffectiveStatus;
  effectiveAt?: string;
  observedValidAt?: string;
  supports: readonly string[];
  evidenceStatus: EvidenceStatus;
  note?: string;
}

export interface FeeGuideItem {
  id: string;
  name: string;
  direction: "debit" | "credit" | "pass-through" | "manual-cost";
  calculation: string;
  applicability: string;
  calculatorTreatment: string;
  sourceIds: readonly string[];
  caveat?: string;
}

export interface FaqItem {
  id: string;
  question: string;
  answer: string;
  sourceIds: readonly string[];
}

export interface ContentSection {
  id: string;
  title: string;
  paragraphs: readonly string[];
  bullets?: readonly string[];
  sourceIds?: readonly string[];
}

export interface PrivacySection {
  id: string;
  title: string;
  paragraphs: readonly string[];
  bullets?: readonly string[];
}

export interface ChangelogEntry {
  date: string;
  version: string;
  catalogId?: string;
  title: string;
  changes: readonly string[];
}
