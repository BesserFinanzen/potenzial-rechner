// Schema der Seiten-Events. Bewusst getrennt von schema.ts (Rechner-Events): eigener Webhook,
// eigene Data Table, eigene Version. Aenderungen mit PAGE_SCHEMA_VERSION-Bump und Eintrag in docs/tracking.md.
export const PAGE_SCHEMA_VERSION = 1;

export type PageEventName = 'page_view' | 'scroll_depth' | 'rechner_visible' | 'engaged_time';

export interface PageTrackEvent {
  event: PageEventName;
  schemaVersion: number;
  sessionId: string;
  ts: string; // ISO 8601
  page: string;
  lid: string | null;
  utm: { source: string; medium: string; campaign: string; content: string; term: string };
  data: Record<string, unknown>;
}
