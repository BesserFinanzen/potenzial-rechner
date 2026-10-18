// Versioniertes Event-Schema fuer den n8n-Webhook. Aenderungen immer mit
// schemaVersion-Bump und Eintrag in docs/tracking.md.
export const SCHEMA_VERSION = 1;

export type EventName =
  | 'rechner_view'
  | 'rechner_start'
  | 'rechner_step'
  | 'rechner_result'
  | 'rechner_reset'
  | 'calendly_scheduled';

export interface TrackEvent {
  event: EventName;
  schemaVersion: number;
  sessionId: string;
  ts: string; // ISO 8601
  page: string;
  lid: string | null;
  utm: { source: string; medium: string; campaign: string; content: string; term: string };
  data: Record<string, unknown>;
}
