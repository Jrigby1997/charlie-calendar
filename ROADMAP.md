# Roadmap & Parked Ideas

Detailed, self-contained notes for features we've **discussed and scoped but not built yet**,
so we can jump straight in later without re-deciding everything. Each section is written to be
read cold.

**App/deployment context that affects all of these:**
- Next.js (App Router) deployed on **Vercel** → the live app is served over **HTTPS on a public URL**.
- **Supabase** backend; schema changes are applied by running the `supabase_migration_*.sql`
  files manually in the Supabase SQL editor.
- The app is designed to live on an **always-on device in the kitchen**, which is **always on the
  home Wi-Fi network**. It is not primarily used on individual phones.

---

## A. Home Assistant "🏠 Home" panel + smart-home control

**Goal:** a "Home" panel in the app showing smart-home device states (thermostat, lights, locks,
garage, who's-home, sensors) and letting you control them (toggle lights, set temp), on the kitchen
display.

### Decision: Home Assistant is the foundation (not Google Home)
- **Home Assistant (HA)** is free, open-source hub software that connects to almost all smart-home
  gear and exposes **one local API** (REST + WebSocket) our app can talk to. This is the way.
- **Google Home / Nest** has **no good public API** to read/control arbitrary devices from a custom
  app. (Nest's "Smart Device Management" API is Nest-only, needs a paid $5 registration + Google
  Cloud project + OAuth.) If you own Google/Nest devices, the pattern is: **HA integrates with them**,
  and our app talks to HA. So HA is the hub either way.
- Per-brand cloud APIs (Hue, ecobee, …) directly = fragile, piecemeal, lots of per-brand work. Skip.

### Can we build it before buying the final hardware?
**Yes — ~80–90% of the code can be built without the final hub, but verifying it needs *some* HA
instance.** That instance does NOT have to be your real hardware — a throwaway HA in Docker (with
demo/fake entities) is enough to build and test against end-to-end. When the real hub arrives, just
point the app at it; the panel renders whatever entities HA exposes (it's generic).

Building totally blind (no HA at all, only a mock) is possible but risks rework on the connectivity/
auth details, which are the fiddly part. **A temporary Docker HA is the real unlock, not the $99 box.**

### Effort estimate (once *an* HA endpoint exists): ~1–3 focused days
| Piece | Lift |
|---|---|
| Settings: store HA base URL + long-lived token (new fields / small table + a Settings "Home" tab) | Small |
| HA client: read entity states, send service calls (on/off, set temp) | Small–Medium |
| 🏠 Home panel: grouped tiles (lights / climate / locks / sensors) with toggles + sliders | Medium |
| Entity picker (HA exposes hundreds; we surface ~10 on the wall) | Small–Medium |
| Live updates: poll every few seconds, or WebSocket for instant | Small–Medium |

### The one genuine gotcha: HTTPS app ↔ local HTTP HA
The live app is HTTPS (public); HA lives on the LAN over HTTP (private). A browser blocks an HTTPS
page from calling a plain-HTTP local address ("mixed content"). The Vercel **server** can't reach
your LAN either, so a server-side proxy doesn't help unless HA is cloud-exposed. Two clean fixes:
1. **Nabu Casa** (HA's official cloud, ~$6.50/mo): gives HA a stable HTTPS address + token. Simplest,
   works anywhere. Recommended if you don't want to fuss with certs.
2. **Local HTTPS**: put a trusted TLS cert on HA (or a small local reverse proxy, e.g. Caddy/NGINX).
   Free, fully local/private, slightly more setup.
Either works since the kitchen device is always on the home network. **Finalize this once a real HA
is up** — it's easier to nail down with the endpoint in hand. The app code is the same regardless.

### "Jump right in" checklist (do these in order when ready)
1. **Stand up HA.** Real hub (Home Assistant Green ~$99, or a Raspberry Pi / mini-PC / old laptop),
   OR a throwaway dev instance in Docker on any always-on machine:
   ```bash
   docker run -d --name homeassistant --restart=unless-stopped \
     -p 8123:8123 -v hass-config:/config \
     ghcr.io/home-assistant/home-assistant:stable
   ```
   Open `http://localhost:8123`, create the account. For fake devices to build against, enable the
   **Demo** integration (Settings → Devices & Services → Add → "Demo"), or add real integrations.
2. **Create a long-lived access token:** in HA click your **user profile** (bottom-left) → **Security**
   → **Long-Lived Access Tokens** → **Create Token**. Copy it (shown once).
3. **Decide connectivity:** Nabu Casa (easy) vs local HTTPS (free). See gotcha above.
4. **Then tell Claude to build the panel.** Reference this section. Build order:
   - Settings "Home" tab: HA base URL + token (store per-user; treat token as a secret).
   - `lib/homeAssistant.ts` client (REST first; WebSocket later for live updates).
   - `HomeView` panel: fetch states, group by domain, render tiles with toggles/sliders.
   - Entity picker: choose which entities appear on the wall.
   - Optional: WebSocket subscription for instant state updates.

### HA API quick reference (for whoever builds it)
- Auth: header `Authorization: Bearer <LONG_LIVED_TOKEN>` on every request.
- `GET  http://<ha-host>:8123/api/states` → array of all entities (entity_id, state, attributes).
- `GET  http://<ha-host>:8123/api/states/<entity_id>` → one entity.
- `POST http://<ha-host>:8123/api/services/<domain>/<service>` body `{"entity_id":"light.kitchen"}`
  → control (e.g. `light/turn_on`, `light/turn_off`, `climate/set_temperature`, `lock/lock`).
- Live updates: WebSocket `ws://<ha-host>:8123/api/websocket` → auth handshake → `subscribe_events`
  (event_type `state_changed`). (Polling `/api/states` every ~5s is a fine first version.)
- Docs: https://developers.home-assistant.io/docs/api/rest/ and `/docs/api/websocket/`.

---

## B. Voice control

Split by goal — they have very different effort profiles.

### B1. Voice control of DEVICES ("turn off the kitchen lights") — ~zero app work
Do this through **Google Home / Alexa speakers directly**, once your lights are smart and linked.
No app integration needed. If you go the HA route, HA also has its own voice assistant **"Assist"**,
with optional local wake-word hardware (**Home Assistant Voice**, ~$59). This is the easiest path and
the recommended one for device voice control.

### B2. Voice control of the APP itself ("add milk to the list", "what's for dinner") — doable, moderate
Use the browser's built-in **Web Speech API** (`SpeechRecognition`) on the kitchen display: a
**tap-to-talk mic button** → transcribe → parse the command → perform the app action. Free, runs in
Chrome, good for a wall display. Optionally route the transcript through an LLM so phrasing can be
natural (adds a small per-use API cost).
- Caveat: a true **always-listening "Hey <wake word>"** is NOT reliable in a browser — you'd tap a
  mic button (or a physical button). Always-on wake word needs dedicated hardware/software
  (HA Voice, or a wake-word engine like Porcupine) — a bigger lift.

### B3. What is NOT worth it
A custom **"Hey Google, tell Charlie Calendar to…"** Assistant Action — **Google deprecated custom
Conversational Actions in 2023.** Don't invest here.

### Recommendation
- Device voice → Google Home / Alexa / HA Assist directly (no app work).
- App voice → add a tap-to-talk mic on the kitchen screen (moderate; LLM optional).
- Always-on wake word → only if you add HA Voice hardware.

---

## C. Budgeting / Allowance (parked — revisit later)

Discussed re: adding a Plaid-powered budgeting module. Decision, so we don't re-litigate it:

- **Do the free, safe version first:** a **manual allowance / budget module**, gated behind the
  existing Admin PIN and kept **off** the always-on wall view. Reuse the existing reward-currency
  plumbing (kids' allowance ↔ chores). Category budgets + manual expense entry. Free, no external
  dependency, fits the app.
- **Plaid (automatic bank-transaction import) only later, and carefully:** behind a feature flag +
  Admin PIN; access tokens stored **server-side only**; start in **Plaid Sandbox** (free). Plaid
  **Production costs money per linked account** — conflicts with the "free for our family" priority —
  so only flip to Production if a few $/month is acceptable and you're OK owning bank data
  (encryption, privacy policy, real security responsibility).
- **If the goal is a *sellable* budgeting product:** make it a **standalone app**, not bolted onto the
  family calendar. Personal finance is a crowded, high-trust market (YNAB/Monarch/Copilot); bundling
  it dilutes both and drags calendar users into fintech compliance.

---

_Last updated: 2026-08-15. See also `GOOGLE_CALENDAR_INTEGRATION.md`, `STYLE_GUIDE.md`, `DEV_PROFILE.md`._
