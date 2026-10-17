# Webflow-Einbindung (noch nicht umgesetzt)

1. Build von `rechner.js` auf Hosting (Cloudflare Pages) veröffentlichen.
2. Auf `/erstgespraech` die weiße Karte `.r19` (`#rechner`) im Hero komplett durch folgendes Embed ersetzen (das Widget ist selbst die Karte, `flex: 1 1 400px`, max. 520 px):
```html
<div data-bf-rechner data-endpoint="https://<n8n-host>/webhook/<id>" data-calendar="calendly-rechner-embed"></div>
<script src="https://<hosting>/potenzial-rechner/v1/rechner.js" defer></script>
```
3. Der bestehende Calendly-Embed (`#calendly-rechner-embed`, `window.startCalendlyIn`) bleibt unverändert; das Widget ruft ihn nach dem Ergebnis auf.
4. `RECHNER_LIVE` im Page-Head auf `true` setzen, `noindex` erst nach Freigabe entfernen.
