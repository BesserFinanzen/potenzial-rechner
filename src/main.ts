import { h, render } from 'preact';
import css from './styles/widget.css?inline';
import { App } from './widget/App';
import { createTracker } from './tracking/client';
import { startPageTracking } from './tracking/page';

// Mountet das Widget in jedes <div data-bf-rechner>. Optionen per data-Attribut:
//   data-endpoint  n8n-Webhook-URL (ohne: nur Konsole)
//   data-calendar  ID des Calendly-Containers (Default: calendly-rechner-embed)
//   data-page-endpoint  optional: Webhook fuer Seiten-Events (page_view, scroll_depth, ...); ohne: aus. "console" loggt nur.
// Das Widget ist die komplette weisse Karte (ersetzt .r19 im Hero): max. 520 px breit, am Desktop so hoch wie die Hero-Zeile.
function mount(host: HTMLElement) {
  if (host.shadowRoot) return;
  const root = host.attachShadow({ mode: 'open' });
  const style = document.createElement('style');
  style.textContent = css;
  const app = document.createElement('div');
  app.className = 'root';
  root.append(style, app);
  const tracker = createTracker(host.dataset.endpoint ?? null);
  render(h(App, { tracker, calendarId: host.dataset.calendar ?? 'calendly-rechner-embed' }), app);
  if (host.dataset.pageEndpoint) startPageTracking(host.dataset.pageEndpoint, host);
}

function init() {
  document.querySelectorAll<HTMLElement>('[data-bf-rechner]').forEach(mount);
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
else init();
