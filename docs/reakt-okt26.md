# Reaktivierungskampagne Okt26 (Close → ActiveCampaign → Website → Close)

Gesamtablauf:
1. **Nachschub:** n8n holt Leads aus einer Close-Smart-View und legt sie in ActiveCampaign auf die Liste „Reaktivierung Okt26“.
2. **Mails:** Eine AC-Automation auf dieser Liste verschickt die Reakt-Mails mit Links auf `/erstgespraech` (siehe Link-Parameter).
3. **Tracking:** Widget und Seiten-Tracking schreiben die Besuche mit `lid` und UTM nach n8n (`docs/tracking.md`).
4. **Rückspiegelung:** Die Funnel-Aggregation schreibt engagierte Leads als Aktivität „A. E-Mail Kampagne: Reakt 10.26“ nach Close (`docs/tracking.md`, Abschnitt Close-Aktivität).
5. **Opt-Out:** Abmeldungen in AC kommen per Webhook zurück nach Close.

## 1. Nachschub Close → ActiveCampaign
Workflow „Reakt Okt26 | Nachschub Close -> ActiveCampaign“ (https://bfmg.app.n8n.cloud/workflow/ADqVVZapez27mSYT, Projekt BesserFinanzen). **Stand 2026-10-21: nicht aktiv**, noch nie gelaufen.

Auslöser: alle 2 Tage um 09:00.

Quelle: Close-Smart-View „Reakt Okt26 – Warteschlange (AKTIV, eigenständig)“ (`save_mKQMwh9bRknaLFkFzBFlvOcdOX4kQOea9zuHCUvbHQY`, nicht löschen). Filter laut Beschreibung: Eingang 01.01.24–02.02.26, Projekt BF/PFH, ohne Unbrauchbar/Gewonnen, ohne „Kunde seit“, ohne Zweitgespräch, ohne Kontakt in den letzten 90 Tagen, ohne Lösch-/Widerspruch, „Reakt-Kampagne“ leer, „Mail-Kontakt erlaubt“ nicht „Nein“.

Ablauf:
- „Close Smart View abrufen“ holt bis zu 200 Leads. „50 Leads mit E-Mail auswählen“ nimmt davon die ersten 50 mit gültiger, in Close nicht abgemeldeter E-Mail (je E-Mail einmal) und zerlegt den Kontaktnamen in Vor- und Nachname.
- Je Lead: „AC Kontakt suchen“ per E-Mail → aktualisieren oder neu anlegen. Gesetzt werden Vorname, Nachname, Telefon, AC-Feld 4 = Close-Lead-ID, AC-Feld 2 = Projekt.
- „AC zur Liste Reaktivierung Okt26“ (AC-Liste 9).
- Erfolg: In Close „Reakt-Kampagne“ = `reakt_okt26` und „Reakt-Startdatum“ = heute. Damit fällt der Lead aus der Smart View.
- Fehler (AC-Update, -Anlage oder Listeneintrag): „Reakt-Kampagne“ = `reakt_okt26_fehler`. Auch diese Leads fallen aus der Smart View und müssen von Hand geprüft werden.

Offen vor dem Aktivieren:
- **Schutz gegen erneutes Anmelden fehlt:** Der Listeneintrag meldet einen bestehenden AC-Kontakt auch dann an, wenn er sich vorher in AC abgemeldet hat. Abmeldungen vor dem 2026-10-21 stehen in Close nicht als „Mail-Kontakt erlaubt = Nein“, weil der Opt-Out-Webhook erst seit diesem Tag existiert. Vor dem Listeneintrag muss geprüft werden, ob der Kontakt in AC auf einer Liste abgemeldet oder hart gebounct ist.
- **AC-Automation fehlt:** Stand 2026-10-21 startet keine Automation bei Anmeldung auf Liste 9, und es gibt keine Reakt-Mails in AC.

## 2. Link-Parameter in den Mails
Damit Tracking und Close-Aktivität den Klick einem Lead zuordnen, braucht jeder Link auf `/erstgespraech`:

```
?lid=<AC-Feld 4, Close-Lead-ID>&utm_source=activecampaign&utm_medium=email&utm_campaign=reakt_okt26&utm_content=mail1
```

`utm_content` je Mail hochzählen (`mail1`, `mail2`, …). `lid` muss exakt die Close-Lead-ID sein (`lead_…`, ohne angehängte Zeichen), sonst schlägt der Close-Write in der Funnel-Aggregation fehl. Die Kampagne `reakt_okt26` steht fest im Code-Node „Close-Aktivität vorbereiten“.

## 3. Opt-Out ActiveCampaign → Close
Workflow „AC | Opt-out nach Close“ (https://bfmg.app.n8n.cloud/workflow/IXeNZ1qxrpUogcHw, Projekt BesserFinanzen), aktiv. Die aktuelle Version mit Grund, Kampagne und Mail ist seit 2026-10-21 veröffentlicht.

Auslöser: AC-Webhook „Opt-Out“ (AC-Webhook-ID 1) auf `https://bfmg.app.n8n.cloud/webhook/ac-optout-k7q2m9`. Ereignis `unsubscribe`, alle Listen, Quellen public/admin/api/system. Der Webhook hat keine Authentifizierung, geschützt ist er nur durch den Pfad.

Ablauf:
- „Abmeldung normalisieren“: E-Mail, AC-Kontakt-ID, Listenname und -ID, `initiated_from`, Zeitpunkt. Ohne E-Mail endet der Lauf.
- AC: Kontakt, Listenabos, Kampagne und Mail holen. Aus dem Abo der abgemeldeten Liste kommen Abmeldegrund (`unsubreason`), Kampagne und Mail. Fehler in diesen Schritten brechen den Lauf nicht ab, die Felder bleiben dann leer.
- Close: Lead per E-Mail suchen, beim ersten Treffer „Mail-Kontakt erlaubt“ = „Nein“ setzen.
- Close-Aktivität „A. E-Mail Opt-Out“ (`actitype_0JkvL3xiP0vQsvtl8QlP0c`): Grund (Abmeldegrund, sonst „initiiert von: …“), Kampagne, Liste, Mail (Betreff), Opt-Out am.

Grenzen: Bei mehreren Close-Leads mit derselben E-Mail wird nur der erste aktualisiert. Ohne Treffer in Close bricht die Ausführung ab (betrifft nur AC-Kontakte, die nicht aus Close stammen). Bounces und Spam-Beschwerden werden nicht gespiegelt.
