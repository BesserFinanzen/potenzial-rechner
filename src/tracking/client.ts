import { EventName, SCHEMA_VERSION, TrackEvent } from './schema';

const KEY = 'bf-rechner-session';

function sessionId(): string {
  try {
    let id = sessionStorage.getItem(KEY);
    if (!id) {
      id = crypto.randomUUID();
      sessionStorage.setItem(KEY, id);
    }
    return id;
  } catch {
    return 'no-storage-' + Math.random().toString(36).slice(2);
  }
}

export interface Tracker {
  track(event: EventName, data?: Record<string, unknown>): void;
}

/** Sendet Events an den n8n-Webhook. Ohne endpoint nur Konsole (Dev) + CustomEvent. */
export function createTracker(endpoint: string | null): Tracker {
  const sid = sessionId();
  const p = new URLSearchParams(location.search);
  const queue: TrackEvent[] = [];
  let flushing = false;

  async function flush() {
    if (flushing || !endpoint) return;
    flushing = true;
    while (queue.length) {
      const ev = queue[0];
      try {
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain' }, // vermeidet CORS-Preflight
          body: JSON.stringify(ev),
          keepalive: true,
        });
        if (!res.ok) throw new Error(String(res.status));
        queue.shift();
      } catch {
        if (queue.length > 50) queue.shift();
        break; // Retry beim naechsten Event
      }
    }
    flushing = false;
  }

  addEventListener('pagehide', () => {
    if (!endpoint) return;
    while (queue.length) navigator.sendBeacon(endpoint, JSON.stringify(queue.shift()));
  });

  return {
    track(event, data = {}) {
      const ev: TrackEvent = {
        event,
        schemaVersion: SCHEMA_VERSION,
        sessionId: sid,
        ts: new Date().toISOString(),
        page: location.pathname,
        lid: p.get('lid'),
        utm: {
          source: p.get('utm_source') ?? '',
          medium: p.get('utm_medium') ?? '',
          campaign: p.get('utm_campaign') ?? '',
          content: p.get('utm_content') ?? '',
          term: p.get('utm_term') ?? '',
        },
        data,
      };
      dispatchEvent(new CustomEvent('bf:rechner:track', { detail: ev }));
      if (!endpoint) console.debug('[bf-rechner]', ev);
      queue.push(ev);
      void flush();
    },
  };
}
