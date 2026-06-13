# Plan: Stripe/TWINT-Integration (Pay-per-Part)

Status: Planung. Umsetzung in Phasen, jede Phase einzeln deploybar.

## 1. Entscheidungen & Modell (festgelegt)

- **Kein Gratis-für-alle, kein Abo im MVP.** Monetarisiert wird das
  episodische Repair: bezahlt wird **pro Teil**.
- **Konto-Pflicht zum Download.** Anonyme dürfen fotografieren, designen und
  die 3D-Vorschau drehen – der **Download (STL/3MF)** verlangt ein Konto.
- **Willkommens-Guthaben: 3 Gratis-Generierungen** bei Konto-Erstellung
  (einmalig, kein Monats-Reset). Danach kostenpflichtig.
- **Einheit = „Teil freischalten" (1 Credit).** Ein Credit schaltet ein Teil
  (Archetyp + konkrete Parameter) frei; **erneuter Download desselben Teils in
  jedem Format ist gratis** (entspricht „CHF 4 statt CHF 60 Ersatzteil").
- **Kauf per Einmalzahlung:** Pay-per-Part (1 Credit) oder Credit-Packs
  (z. B. 5 / 20). **TWINT** ist bei Stripe nur für Einmalzahlungen verfügbar →
  passt exakt; Karte ebenfalls.
- **Abos (Maker/Pro) und STEP/Pro-Gating: bewusst Phase C / später.**

### Harte Stripe-/TWINT-Fakten

- **TWINT in Stripe = Single-use, nur One-time-Payments**, kein Recurring.
  Darum sind Credit-Packs (nicht Abos) der TWINT-Weg. Währung **CHF**.
- Preis-Hoheit **immer serverseitig** (SKU → Stripe-Price-ID im Backend), nie
  Beträge aus dem Client.
- Webhook ist die **einzige** Quelle für Gutschriften (nie der Erfolgs-Redirect).
  Idempotent über die Stripe-Session-ID.

## 2. Enforcement-Punkt

Der Download ist der Engpass. Heute lädt `/create` die STL aus der Vorschau
(clientseitig gecacht) und holt 3MF frisch über `/api/cad/generate` (ungated).

**Neu:** ein gated Endpoint `POST /api/download` wird zur einzigen Quelle der
**sauberen** Datei:

1. prüft Auth (Konto-Pflicht),
2. `record_part` (existiert) → `part_id`,
3. `unlock_part(part_id)` (Credit ziehen **oder** bereits freigeschaltet),
4. bei Erfolg: proxyt `/generate` im CAD-Service und streamt die Datei,
5. bei 0 Credits: **HTTP 402** → Frontend zeigt Paywall.

Die Live-Vorschau (`/api/cad/generate`) bleibt ungated.

> **Bekannte Lücke (MVP-bewusst):** Die Vorschau-STL liegt im Browser-Speicher
> und ist technisch extrahierbar. Für die Zielgruppe (Heimwerker, kein CAD)
> ist der serverseitig gegatete Download-Button ausreichend. **Härtung
> später:** Vorschau als bewusst gröber tesselliertes/markiertes Mesh, sauberes
> Mesh nur über `/api/download`.

## 3. Datenmodell (neue Migration, RLS + Least-Privilege)

Muster wie `analyze_usage` (SECURITY DEFINER + gezielte Grants, Eiserne Regel 5).

```
profiles                      -- 1:1 zu auth.users
  user_id uuid PK → auth.users
  credits int not null default 0
  welcome_granted bool default false
  plan text default 'payg'    -- reserviert für Phase C (maker/pro)
  created_at, updated_at

credit_transactions           -- append-only Ledger (Audit + Idempotenz)
  id uuid PK
  user_id uuid
  delta int                   -- +3 welcome, +N purchase, -1 spend
  reason text                 -- welcome|purchase|spend|refund|admin
  part_id uuid null → parts
  stripe_session_id text unique null   -- Idempotenz für Käufe
  created_at

parts (bestehend)             -- + Spalte:
  unlocked_at timestamptz null -- gesetzt beim Freischalten (Re-Download gratis)
```

### RPCs (SECURITY DEFINER, search_path='')

- `grant_welcome_credits()` – legt profiles-Zeile an, +3, idempotent über
  `welcome_granted`. Aufruf beim ersten Login (Auth-Callback) oder lazy beim
  ersten Download.
- `unlock_part(p_part_id uuid) → jsonb` – wenn Teil dem User gehört und schon
  `unlocked_at` → ok; sonst wenn `credits > 0` → −1, Spend-Txn, `unlocked_at`
  setzen; sonst `{allowed:false, reason:'no_credits'}`. Atomar.
- `add_purchased_credits(p_session_id text, p_qty int) → jsonb` – idempotente
  Gutschrift aus dem Webhook (service_role).
- `get_billing_state() → jsonb` – `credits` + Anzahl freigeschalteter Teile.

Grants: `anon` keine; `authenticated` execute auf `unlock_part`,
`grant_welcome_credits`, `get_billing_state`; `add_purchased_credits` nur
`service_role`. Tabellen-RLS: Eigentümer liest eigene Zeilen, keine direkten
Writes (nur via RPC).

## 4. Backend (Next.js Route Handlers)

- `POST /api/download` – gated Datei-Lieferung (siehe §2). Ersetzt den
  direkten 3MF/STL-Pfad in `/create`.
- `POST /api/checkout` – Body `{sku: 'single'|'pack5'|'pack20'}`. Erzeugt
  Stripe **Checkout Session** (`mode:'payment'`, `currency:'chf'`,
  `payment_method_types:['card','twint']`, Line-Item = server-gemappte
  Price-ID, `client_reference_id = user_id`, `metadata.qty`,
  success/cancel auf `/create`). Gibt `session.url` zurück → Client-Redirect.
- `POST /api/stripe/webhook` – **raw body** (Runtime `nodejs`, Body-Parsing
  aus), Signatur via `STRIPE_WEBHOOK_SECRET` prüfen. Auf
  `checkout.session.completed` → `add_purchased_credits(session.id, qty)`
  (service_role-Client). 200 zurück.

Stripe-SDK: `stripe` (Node). Ein `lib/stripe.ts` (Secret-Client) +
`lib/billing.ts` (Client-Helfer: balance, startCheckout, download).

## 5. Frontend (`/create` + Konto)

- **Guthaben-Anzeige** (Credits) in der `AccountBar`.
- **Download-Button** ruft `/api/download`:
  - nicht angemeldet → Hinweis „Konto für Download" (Link `/login`).
  - 402 → **Paywall-Sheet**: „Dieses Teil freischalten – CHF X" (Pay-per-Part)
    + Pack-Optionen, Buttons → `/api/checkout` → Redirect zu Stripe.
  - ok → Datei speichern (wie heute), Guthaben aktualisieren.
- **Freigeschaltete Teile** sind als solche markiert (Re-Download gratis).
- Nach Rückkehr von Stripe (`?purchase=success`) Balance neu laden + Toast.
- i18n (de-CH) für alle neuen Texte.

## 6. Sicherheit & Robustheit

- Webhook-Signaturprüfung; Idempotenz über `stripe_session_id UNIQUE`.
- Preis-/Mengen-Hoheit serverseitig (SKU-Map), Client schickt nur die SKU.
- RLS auf allen neuen Tabellen, Writes nur via SECURITY-DEFINER-RPCs.
- `unlock_part` atomar (kein Race bei Doppelklick).
- Keine Kartendaten in der App (Stripe Hosted Checkout, PCI-Scope minimal).

## 7. Phasen (jede einzeln deploybar)

- **Phase A – Entitlement & Gating (ohne Geld):** Migration (profiles,
  credit_transactions, parts.unlocked_at, RPCs), Welcome-Credits,
  `/api/download` + Paywall-UI, Guthaben-Anzeige. Käufe noch manuell
  (Admin-Grant) zum Testen. → Lockout + 3-Gratis funktionieren live.
- **Phase B – Stripe/TWINT:** `/api/checkout`, Webhook, Credit-Packs,
  Buy-UI, Stripe-Produkte/Preise (Test→Live). → echte Einmalzahlungen + TWINT.
- **Phase C – später:** Abos (Maker/Pro) via Subscriptions (Karte),
  STEP/Pro-Gating, mehrere Drucker-Profile als Pro-Feature, Billing-Portal,
  CH-MwSt (Stripe Tax), Rechnungen, B2B.

## 8. Env / Config

Vercel (Server-only, kein `NEXT_PUBLIC_`):
`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`,
`STRIPE_PRICE_SINGLE`, `STRIPE_PRICE_PACK5`, `STRIPE_PRICE_PACK20`.
Preise in Stripe-Dashboard (CHF, One-time), TWINT im Payment-Methods-Setup
aktivieren. Lokaler Test: `stripe listen --forward-to localhost:3000/api/stripe/webhook`.

## 9. Preise (festgelegt)

| SKU | Credits | Preis | CHF/Credit |
|---|---|---|---|
| `single` (Pay-per-Part) | 1 | CHF 3.00 | 3.00 |
| `pack5` | 5 | CHF 12.00 | 2.40 (−20 %) |
| `pack20` | 20 | CHF 48.00 | 2.40 (−20 %) |

- **Willkommens-Guthaben: 3 Credits, lebenslang** (kein Reset).
- Alle Preise CHF, Einmalzahlung (Karte + TWINT).

## 10. Offen für später (Annahmen)

- MwSt/Quittungen → Phase C (Stripe Tax).
- Vorschau-Härtung (gröberes Mesh) → später.

## 11. Was Phase B braucht (Hand-off)

Stripe-Konto-Zugriff: Test- und Live-Keys, drei Preise (CHF, one-time) im
Dashboard anlegen, TWINT in den Payment-Methods aktivieren. Ohne diese Keys
ist nur Phase A (ohne Geld) lokal lauffähig. **Phase A wird NICHT allein auf
Prod deployt** (würde nach 3 Gratis-Teilen ohne Bezahlweg aussperren) – Deploy
erst gemeinsam mit Phase B.
