import { PAGE_SCHEMA_VERSION, PageEventName, PageTrackEvent } from './page-schema';

// Gleicher Key wie in client.ts: so lassen sich Seiten- und Rechner-Events per sessionId verbinden.
// Absichtlich nicht importiert, damit client.ts unveraendert bleibt.
const SESSION_KEY = 'bf-rechner-session';

export const DEPTHS = [25, 50, 75, 100] as const;
export const HEARTBEAT_S = 15;
export const MAX_ENGAGED_S = 300;
export const IDLE_S = 10;
const BOTTOM_TOLERANCE_PX = 2;

/** Schwellen, die bei dieser Scrollposition neu erreicht sind. Kurze Seiten (alles sichtbar) erreichen sofort alle. */
export function reachedDepths(scrollY: number, viewportH: number, docH: number, reached: ReadonlySet<number>): number[] {
  if (docH <= 0) return [];
  const bottom = scrollY + viewportH;
  return DEPTHS.filter((d) => !reached.has(d) && bottom >= (docH * d) / 100 - BOTTOM_TOLERANCE_PX);
}

/** Zaehlt aktive Sekunden: nur bei sichtbarem Tab und Interaktion innerhalb der letzten IDLE_S Sekunden. */
export class EngagedClock {
  seconds = 0;
  private lastActiveMs: number;
  constructor(startMs: number, private idleMs = IDLE_S * 1000) {
    this.lastActiveMs = startMs;
  }
  activity(nowMs: number) {
    this.lastActiveMs = nowMs;
  }
  /** Ein Tick = eine Sekunde. Gibt true zurueck, wenn die Sekunde als aktiv gezaehlt wurde. */
  tick(nowMs: number, visible: boolean): boolean {
    if (!visible || nowMs - this.lastActiveMs > this.idleMs) return false;
    this.seconds += 1;
    return true;
  }
}

/** Heartbeat-Zeitpunkte: 15, 30, ... bis MAX_ENGAGED_S. */
export function isHeartbeat(seconds: number): boolean {
  return seconds > 0 && seconds <= MAX_ENGAGED_S && seconds % HEARTBEAT_S === 0;
}

function sessionId(): string {
  try {
    let id = sessionStorage.getItem(SESSION_KEY);
    if (!id) {
      id = crypto.randomUUID();
      sessionStorage.setItem(SESSION_KEY, id);
    }
    return id;
  } catch {
    return 'no-storage-' + Math.random().toString(36).slice(2);
  }
}

function referrer(): string {
  try {
    const u = new URL(document.referrer);
    return u.origin + u.pathname;
  } catch {
    return '';
  }
}

let started = false;

/**
 * Seiten-Tracking: page_view, scroll_depth, rechner_visible, engaged_time.
 * endpoint 'console' loggt nur (Dev). Laeuft hoechstens einmal pro Seite.
 */
export function startPageTracking(endpoint: string, widgetHost: Element): void {
  if (started) return;
  started = true;

  const toConsole = endpoint === 'console';
  const sid = sessionId();
  const p = new URLSearchParams(location.search);
  const queue: PageTrackEvent[] = [];
  let flushing = false;

  async function flush() {
    if (flushing || toConsole) return;
    flushing = true;
    while (queue.length) {
      try {
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain' }, // vermeidet CORS-Preflight
          body: JSON.stringify(queue[0]),
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

  function track(event: PageEventName, data: Record<string, unknown> = {}) {
    const ev: PageTrackEvent = {
      event,
      schemaVersion: PAGE_SCHEMA_VERSION,
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
    dispatchEvent(new CustomEvent('bf:page:track', { detail: ev }));
    if (toConsole) {
      console.debug('[bf-page]', ev);
      return;
    }
    queue.push(ev);
    void flush();
  }

  // page_view
  track('page_view', { referrer: referrer(), viewport: { w: innerWidth, h: innerHeight } });

  // scroll_depth
  const reached = new Set<number>();
  let scheduled = false;
  const checkDepth = () => {
    scheduled = false;
    const docH = document.documentElement.scrollHeight;
    for (const depth of reachedDepths(scrollY, innerHeight, docH, reached)) {
      reached.add(depth);
      track('scroll_depth', { depth });
    }
    if (reached.size === DEPTHS.length) removeEventListener('scroll', onScroll);
  };
  const onScroll = () => {
    if (!scheduled) {
      scheduled = true;
      requestAnimationFrame(checkDepth);
    }
  };
  addEventListener('scroll', onScroll, { passive: true });
  checkDepth();

  // rechner_visible
  if (typeof IntersectionObserver !== 'undefined') {
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          // Bei Widgets, die hoeher als der Viewport sind, kann die Ratio 0.5 nie erreicht werden.
          if (e.isIntersecting && (e.intersectionRatio >= 0.5 || e.intersectionRect.height >= innerHeight * 0.5)) {
            io.disconnect();
            track('rechner_visible');
            return;
          }
        }
      },
      { threshold: [0.1, 0.25, 0.5, 0.75, 1] },
    );
    io.observe(widgetHost);
  }

  // engaged_time
  const clock = new EngagedClock(Date.now());
  let lastSent = 0;
  const mark = () => clock.activity(Date.now());
  for (const type of ['pointerdown', 'keydown', 'scroll', 'touchstart'] as const) {
    addEventListener(type, mark, { passive: true });
  }
  setInterval(() => {
    if (clock.tick(Date.now(), document.visibilityState === 'visible') && isHeartbeat(clock.seconds)) {
      lastSent = clock.seconds;
      track('engaged_time', { seconds: clock.seconds });
    }
  }, 1000);

  addEventListener('pagehide', () => {
    if (clock.seconds > lastSent) track('engaged_time', { seconds: clock.seconds, final: true });
    if (toConsole) return;
    while (queue.length) navigator.sendBeacon(endpoint, JSON.stringify(queue.shift()));
  });
}
