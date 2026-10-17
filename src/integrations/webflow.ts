// Schnittstelle zur Webflow-Seite (Erstgespraech): Calendly-Embed starten
// und Events zurueckmelden.
declare global {
  interface Window {
    startCalendlyIn?: (id: string) => void;
  }
}

export function startCalendly(elementId: string): void {
  window.startCalendlyIn?.(elementId);
}

export function onCalendlyScheduled(cb: () => void): void {
  addEventListener('message', (e: MessageEvent) => {
    if (e.data && e.data.event === 'calendly.event_scheduled') cb();
  });
}

export function scrollToCalendar(elementId: string): void {
  document.getElementById(elementId)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
}
