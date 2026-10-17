# Tracking (n8n)

Das Widget schickt pro Ereignis ein JSON per `POST` (Content-Type `text/plain`, um CORS-Preflight zu vermeiden)
an die URL aus `data-endpoint`. Ohne `data-endpoint` werden Events nur in die Konsole geschrieben.
Zusätzlich feuert jedes Event ein `CustomEvent('bf:rechner:track')` auf `window` (z. B. für Meta Pixel/Klaviyo).

## Events (schemaVersion 1)
| event | Zeitpunkt | data |
|---|---|---|
| rechner_view | Widget geladen | – |
| rechner_start | erste Eingabe des Nutzers | – |
| rechner_step | Feld verlassen (Blur) | `field`, `value` |
| rechner_result | Klick auf „Ergebnis zeigen“ mit gültigen Angaben | `inputs`, `result`, `calcVersion` |
| rechner_edit | Angabe im Ergebnis-Zustand geändert und neu gültig berechnet (0,7 s entprellt) | `inputs`, `result`, `calcVersion` |
| rechner_cta_click | CTA „Erstgespräch buchen“ | – |
| calendly_scheduled | Termin gebucht (Calendly-Message) | – |

Gemeinsame Felder: `event`, `schemaVersion`, `sessionId`, `ts`, `page`, `lid`, `utm{source,medium,campaign,content,term}`, `data`.

## n8n
Webhook (POST) → prüfen `schemaVersion` → speichern (Data Table) → optional über `lid` zuordnen und an ActiveCampaign/CRM geben.
Datenschutz: Hinweistext auf der Seite und AVV/Einwilligung vor Livegang prüfen.
