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
| rechner_reset | Klick auf „Neu berechnen“ (zurück zur Eingabe, Werte bleiben stehen) | – |
| calendly_scheduled | Termin gebucht (Calendly-Message) | – |

`result` enthält seit calcVersion 0.2.0: `endCurrent`, `endOptimized`, `potential`, `years`, `marginalRate`, `annualRefund`, `totalRefund` (additiv, `schemaVersion` bleibt 1).

Gemeinsame Felder: `event`, `schemaVersion`, `sessionId`, `ts`, `page`, `lid`, `utm{source,medium,campaign,content,term}`, `data`.

## n8n
Workflow „Potenzial-Rechner | Tracking“ (Projekt BesserFinanzen, https://bfmg.app.n8n.cloud/workflow/qDQ3suKOCCiKU0rc):
Webhook (POST) → Code-Node parst den `text/plain`-Body und prüft `schemaVersion`, `event`, `sessionId`, `ts` → Wait (3 s) → Insert in die Data Table `rechner_events`.

- **Endpoint für `data-endpoint`:** `https://bfmg.app.n8n.cloud/webhook/potenzial-rechner` (Production-URL, nur aktiv, wenn der Workflow veröffentlicht ist; `/webhook-test/…` lauscht nur im Editor).
- **CORS:** Der Webhook erlaubt alle Origins (`allowedOrigins: *`) und antwortet sofort mit 200 ohne Body. Ohne das würde der Browser die Antwort verwerfen und der Client dasselbe Event erneut senden.
- **Dubletten:** Jedes empfangene Event wird als neue Zeile eingefügt (kein Upsert). Doppelt gesendete Events (Retry, Beacon beim Verlassen der Seite) können mehrfach in `rechner_events` stehen. Die Funnel-Aggregation ignoriert sie über `session_id` + `event` + `ts`.
- **Spalten:** Gemeinsame Felder, `utm_source`/`utm_medium`/`utm_campaign`/`utm_content` (kein `utm_term`), bei `rechner_result` `age`, `net_income`, `monthly_savings`, `potential`, `marginal_rate`, `annual_refund`, `total_refund`, `calc_version`. `raw` enthält das komplette Event; `field`/`value` von `rechner_step` stehen nur dort.
- **Ungültige Nutzlast:** Landet als eigene Zeile mit `event = invalid`, Nutzlast in `raw`, nützlich zum Debuggen.
- **Weiterverarbeitung:** Die Funnel-Aggregation (unten) führt die Events pro Session zusammen und schreibt sie für die Reakt-Kampagne per `lid` als Aktivität nach Close. Der Weg der Leads von Close nach ActiveCampaign und der Opt-Out stehen in `docs/reakt-okt26.md`.

Datenschutz: Hinweistext auf der Seite und AVV/Einwilligung vor Livegang prüfen.

## Seiten-Events (optional, getrennt vom Rechner-Tracking)
Zusätzliche Events zu Besuch, Scrolltiefe, Sichtbarkeit des Rechners und aktiver Verweildauer. Sie laufen über einen **eigenen Webhook und eine eigene Data Table** (`seiten_events`) mit eigener Schema-Version (`PAGE_SCHEMA_VERSION` in `src/tracking/page-schema.ts`). Die Rechner-Events oben, ihr Schema, der Workflow und `rechner_events` sind davon nicht betroffen.

**Schalter:** Seit 2026-10-20 ist es auf /erstgespraech aktiv (Attribut am Embed gesetzt und veröffentlicht, alle vier Events live in `seiten_events` bestätigt). Es läuft nur, wenn das Embed `data-page-endpoint` trägt. Ohne Attribut passiert nichts; Attribut entfernen = aus. Der Wert `console` loggt nur in die Konsole (Dev).
```html
<div data-bf-rechner data-endpoint="…/potenzial-rechner" data-page-endpoint="https://bfmg.app.n8n.cloud/webhook/seiten-tracking" data-calendar="calendly-rechner-embed"></div>
```

| event | Zeitpunkt | data |
|---|---|---|
| page_view | Seite geladen | `referrer` (Origin+Pfad), `viewport {w,h}` |
| scroll_depth | Unterer Rand des Viewports erreicht 25/50/75/100 % der Seitenhöhe, je Schwelle einmal pro Seitenaufruf | `depth` |
| rechner_visible | Mindestens die Hälfte des Widgets (oder die Hälfte des Viewports) sichtbar, einmal pro Seitenaufruf | – |
| engaged_time | Aktive Sekunden (Tab sichtbar, Eingabe/Scrollen in den letzten 10 s), alle 15 s bis 300 s, beim Verlassen ein letztes mit `final: true` | `seconds` (kumuliert), `final` |

Gemeinsame Felder wie bei den Rechner-Events (`event`, `schemaVersion`, `sessionId`, `ts`, `page`, `lid`, `utm{…}`, `data`). Kurze Seiten, die ganz in den Viewport passen, melden alle vier Schwellen sofort.

**Verbindung zum Rechner:** Beide Tracker nutzen dieselbe `sessionId` (`sessionStorage`-Key `bf-rechner-session`). `seiten_events` und `rechner_events` lassen sich per `session_id` joinen, z. B. für den Trichter Seitenaufruf → Rechner gesehen → `rechner_start` → `rechner_result` → `calendly_scheduled`.

**n8n:** Eigener Workflow „Seiten-Tracking“ (https://bfmg.app.n8n.cloud/workflow/LuDOoGzxMSgVxNAC, Projekt BesserFinanzen), veröffentlicht. Webhook POST `https://bfmg.app.n8n.cloud/webhook/seiten-tracking` (`allowedOrigins: *`, sofort 200 ohne Body) → Code-Node prüft `schemaVersion`/`event`/`sessionId`/`ts` → Upsert über `session_id` + `event` + `ts` in die Data Table `seiten_events`. Ungültige Nutzlast landet als Zeile `event = invalid` in `raw`. Spalten: gemeinsame Felder, `utm_*`, `depth`, `seconds`, `final`, `referrer`, `viewport_w/h`, `raw`.

Datenschutz: Die Session-ID liegt im `sessionStorage`; das Seiten-Tracking läuft ohne Consent-Abfrage. Datenschutzerklärung und Einwilligungsfrage (§ 25 TDDDG) vor dem Setzen von `data-page-endpoint` klären.

## Zusammengeführte Auswertung (`funnel_sessions`)
Workflow „Funnel-Aggregation“ (https://bfmg.app.n8n.cloud/workflow/6Ql0NWmA6t44JsDX, Projekt BesserFinanzen) läuft alle 30 Minuten. Er liest `seiten_events` und `rechner_events` komplett, ignoriert Dubletten (`session_id` + `event` + `ts`) und schreibt per Upsert eine Zeile je `session_id` in die Data Table `funnel_sessions`. Die beiden Quell-Workflows und -Tabellen werden nur gelesen.

Spalten: `session_id`, `first_seen`, `last_seen`, `page`, `lid`, `utm_*`, `referrer`, `device` (mobile < 768 px, tablet < 1024 px, sonst desktop), `viewport_w/h`, `max_scroll_depth`, `engaged_seconds`, `rechner_visible`, `rechner_started`, `rechner_result`, `calendly_booked`, `stage` (`besuch` → `rechner_gesehen` → `gestartet` → `ergebnis` → `termin`), Rechner-Eingaben und -Ergebnis des letzten `rechner_result`, `seconds_to_result` (Sekunden vom ersten Event bis zum ersten Ergebnis), `last_field` (zuletzt ausgefülltes Feld, zeigt die Abbruchstelle), `is_test` (UTM-Quelle `test`/`claude-test`, UTM-Medium `test` oder `session_id` mit `test-`), `events_total`, `updated_at`, `synced_events` (Stand von `events_total` beim letzten erfolgreichen Close-Write, siehe unten; wird vom Upsert nicht überschrieben).

Grenzen: Der Workflow liest bei jedem Lauf alle Zeilen. Bei sehr viel Traffic auf inkrementelles Lesen umstellen. Sessions ohne Seiten-Events (vor Aktivierung am 2026-10-20) haben leere Scroll-/Zeitfelder.

### Close-Aktivität „A. E-Mail Kampagne: Reakt 10.26“
Der Workflow „Funnel-Aggregation“ schreibt aus `funnel_sessions` zusätzlich eine Custom Activity pro Lead in Close (Close-Node, Typ `actitype_3a6W6x5iHcEghCEpg9fzlU`). Ablauf: „If“ (Session engagiert) → Code-Node „Close-Aktivität vorbereiten“ fasst die Sessions eines Leads zusammen → „Aktivität suchen“ → „Aktivität zuordnen“ → „Aktivität vorhanden?“ → „Aktivität aktualisieren“ oder „Aktivität anlegen“ → „Als synchronisiert markieren“ → „Sync-Stand speichern“ (`synced_events` in `funnel_sessions`). Es entsteht höchstens eine Aktivität je Lead.

Bedingungen:
- Die Session ist engagiert („If“: Ergebnis berechnet, Scrolltiefe ≥ 75 % oder ≥ 60 s aktiv). Sessions darunter fließen nicht in die Aktivität ein, auch nicht in die Summe der aktiven Sekunden.
- Die Session hat `lid` und `utm_campaign = reakt_okt26` und ist kein Test (`is_test`). Die Kampagne steht oben im Code-Node.
- Mindestens eine Session des Leads hat neue Events seit dem letzten Close-Write (`synced_events` leer oder kleiner als `events_total`). Ohne neue Events wird nichts geschrieben.
- Der Lead ist insgesamt engagiert (gleiche Schwellen, Scrolltiefe als Maximum, Sekunden als Summe).

Schlägt der Close-Write fehl (z. B. ungültige `lid`), landet der Lead im NoOp „Close-Fehler“, wird nicht als synchronisiert markiert und bei jedem Lauf erneut versucht. Eine Benachrichtigung gibt es nicht.

Feldzuordnung: Erster Besuch Landingpage (frühester `first_seen`), Gerät (zuletzt genutzt), Scrolltiefe max. (%), Aktive Sekunden auf Website (Summe), Rechner gesehen / gestartet / Ergebnis berechnet (Ja/Nein), Potenzial, Steuervorteil jährlich und gesamt, Eingegebenes Alter, monatliches Einkommen (Netto), aktuelle Sparrate (jeweils letztes Ergebnis), Stufe (Besuch, Rechner gesehen, Rechner Gestartet, Ergebnis gesehen; für „Termin“ gibt es keine Option). Nicht in Close: „Sekunden bis Ergebnis“ und „Letztes ausgefülltes Feld“ (Felder existieren dort nicht mehr).
