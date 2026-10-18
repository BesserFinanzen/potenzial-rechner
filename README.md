# Potenzial-Rechner (Förder- und Steuer-Check)

Einbettbares Widget für die Webflow-Seite `/erstgespraech` von BesserFinanzen.
Preact + TypeScript, Vite-Library-Build (eine Datei `rechner.js`, ~16 KB gzip), Shadow DOM.

## Entwickeln
```bash
npm install
npm run dev      # Demo unter http://localhost:5173/demo/index.html
npm test         # Engine-Tests
npm run build    # dist/rechner.js
```

## Verhalten und Größe
Zustand 1: nur die drei Eingaben (Alter, Netto, Sparrate) plus Button „Ergebnis zeigen“. Zustand 2: nur das Ergebnis mit Chart und dem Button „Neu berechnen“ (zurück zur Eingabe, Werte bleiben stehen).
Die Karte hat in beiden Zuständen dieselbe Größe: Breite wie `.r19` in Webflow (max. 520 px, Padding 32 px, Radius 24 px, gleicher Schatten), Höhe fest 812 px (Mobil, Container ≤ 440 px: 780 px).

## Aufbau
- `src/calc/` – Rechenengine und Annahmen (`config.ts`, `tax.ts` für den Grenzsteuersatz, siehe `docs/rechenlogik.md`)
- `src/widget/` – UI (Stepper, Ergebnis, Chart)
- `src/tracking/` – Events an den n8n-Webhook (`docs/tracking.md`)
- `src/integrations/webflow.ts` – Calendly-Anbindung der Seite
- `demo/` – lokale Testseite

## Einbindung in Webflow
Siehe `docs/webflow-embed.md`. Webflow wird erst nach separater Freigabe geändert.
