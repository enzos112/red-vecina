# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Four roles, each with its own surface:

- **Vecino** (primary): mostly women in charge of household shopping and men over 40, on mid-range phones. Joins by scanning a QR at a local shop, never creates a password, and uses a personal link (`/t/<token>`) to see their balance, upload a receipt photo, request a redemption code, and check their history.
- **Comercio**: owner or cashier of a neighborhood shop, on the phone at the till. Validates a 6-digit code with a customer in front of them (under 10 seconds, two taps), checks the weekly redemption quota, proposes benefits, reads a monthly report and downloads a QR poster.
- **Operador**: on a computer. Reviews uploaded receipts with automatic reading, approves or rejects in one click, and copies pre-written WhatsApp messages.
- **Administrador**: everything the operador does, plus shops, users, the P1–P20 parameters, network indicators and sanctions.

A secondary audience is shop owners deciding whether to join the pilot (`/comercios`).

## Product Purpose

A points program shared across neighborhood shops: neighbors earn points on what they pay at any shop in the network and redeem them as discounts at any other. Success means neighbors discover and return to nearby shops, and no shop loses money on redemptions.

Current stage: an academic project, evaluated by a teacher and validated through interviews with shop owners, heading toward a small pilot. Everything in the system today is demonstration data.

## Positioning

The balancing mechanism is what sets it apart. Every redemption comes with a purchase at least five times the discount. Each shop's redemption quota is tied to the sales the network brings it (3% of those sales, with a weekly minimum), and the quota is released weekly. The system decides which benefits each neighbor sees. The promise to the owner: "You will never give away in discounts more than 3% of what you sell to neighbors in the network." A generic loyalty-card app can't truthfully make that promise. All numbers are pilot hypotheses that live in the parameter table, never in copy or code.

## Operating Context

- WhatsApp is the communication channel, without its API: the panel drafts each message and offers "Copiar" and "Abrir WhatsApp".
- Receipts are photographed thermal paper. A vision model reads them, and the operador always makes the final call.
- The validator runs at a cash register with a customer waiting. The free hosting tier can sleep, so this is the most time-critical screen.
- Scheduled jobs run lazily on the first request of the day (Monday quota recalculation, point expiry, expired codes).
- Out of MVP scope: WhatsApp API, automatic notifications, payments, native app, membership billing.

## Capabilities and Constraints

- Source of truth: `docs/reglas-negocio.md` (rules, P1–P20) and `docs/construccion.md` (roles, screens, design direction, phases). Read them before product decisions.
- Code-level conventions (Spanish domain names, no business numbers in code, ledger-based points, Santiago time on screen) live in `CLAUDE.md`.
- Points move through states: pending → available → redeemed or expired. Codes have a 48-hour countdown (P11).
- Copy is in Chilean Spanish, using "tú", in short sentences with no jargon. Amounts use a period as the thousands separator; dates read like "viernes 20, 18:30". User-facing errors are shown verbatim.
- Open: the legal terms (`/condiciones`) are a draft awaiting legal review.

## Brand Commitments

- Name: Red Vecina. Mark: an R drawn inside a night-blue square with an orange dot.
- Confirmed identity (Nov 15, 2026): "La libreta del almacén". Blue + orange on gridded paper, Archivo, square corners, flat color, no stock photos. Full system in `DESIGN.md`; summary in `docs/construccion.md` §6. The whole app (public, vecino, comercio and admin) uses it.
- **No icons.** The user rejected them explicitly. Actions and states are named in words; imagery comes from typography and composition. Do not reintroduce icons, including those bundled with shadcn components.
- It must read as serious and trustworthy, because points are worth money and the program handles personal data. A playful, "dubious-friendly" look was rejected.
- Use no real brands or logos. wise.com is a structural reference only.

## Evidence on Hand

- The pilot runs in four comunas of Santiago: Santiago Centro, Ñuñoa, Macul and San Miguel (confirmed by the team, Nov 2026). They live in `COMUNAS` in `frontend/src/features/landing/comunas.ts`. It is a controlled prototype pilot, not open nationwide.
- No real shops, testimonials, pilot metrics or press exist yet. The 6 shops and 212 neighbors are fictional demo data (`es_demo`, phones +56 9 0000/0001 xxxx, `redvecina.test` emails). Never present them as real or invent social proof.

## Product Principles

1. **Every redemption comes with a sale.** Design never implies free products or unlimited discounts.
2. **One primary action per screen.** The neighbor's card opens with the balance and a single "Subir boleta" button.
3. **Say it in words.** States, reasons and next steps get a short sentence ("Te faltan 50 puntos para…"), not a symbol.
4. **The till cannot wait.** Validator flows are optimized for seconds and two taps.
5. **Honest pilot.** Numbers are hypotheses from the parameter table, and demo data stays labeled as demo.

## Accessibility & Inclusion

Target WCAG 2.2 AA on every surface. On top of that: high contrast, touch targets of at least 48 px, no text under 15 px, 17–18 px body text, respect for reduced-motion settings, and mobile-first neighbor and shop surfaces.
