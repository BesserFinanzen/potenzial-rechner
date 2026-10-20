# Webflow-Einbindung
Stand 2026-10-20: Das Embed ist auf https://www.besserfinanzen.de/erstgespraech eingebunden (`RECHNER_LIVE=true`, Seite noch `noindex, nofollow`). Die Schritte unten beschreiben die Einbindung.

1. `rechner.js` wird bei jedem Push auf `main` per GitHub Action (`.github/workflows/pages.yml`) gebaut und auf GitHub Pages veröffentlicht:
   `https://besserfinanzen.github.io/potenzial-rechner/v1/rechner.js`
2. Auf `/erstgespraech` die weiße Karte `.r19` (`#rechner`) im Hero komplett durch folgendes Embed ersetzen (das Widget ist selbst die Karte, `flex: 1 1 400px`, max. 520 px):
```html
<div data-bf-rechner data-endpoint="https://bfmg.app.n8n.cloud/webhook/potenzial-rechner" data-calendar="calendly-rechner-embed"></div>
<script src="https://besserfinanzen.github.io/potenzial-rechner/v1/rechner.js" defer></script>
```
3. Der bestehende Calendly-Embed (`#calendly-rechner-embed`, `window.startCalendlyIn`) bleibt unverändert; das Widget ruft ihn nach dem Ergebnis auf.
4. `RECHNER_LIVE` im Page-Head auf `true` setzen, `noindex` erst nach Freigabe entfernen.
5. Optional: Seiten-Tracking einschalten, indem am Embed `data-page-endpoint="https://bfmg.app.n8n.cloud/webhook/seiten-tracking"` ergänzt wird (siehe `docs/tracking.md`, „Seiten-Events“). Ohne das Attribut bleibt alles wie bisher; Attribut entfernen schaltet es wieder ab.
