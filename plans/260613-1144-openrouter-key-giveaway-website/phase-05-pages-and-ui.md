---
phase: 5
title: "Pages and UI"
status: pending
priority: P2
effort: "1d"
dependencies: [4]
---

# Phase 5: Pages and UI

## Overview
The three user-facing pages: landing (`/`), dashboard (`/dashboard`), usage docs (`/docs`). Soft star nudge (CTA, not enforced). Keep it clean and minimal — this is a small giveaway site.

## Requirements
- Functional: landing explains purpose + available model + how-it-works + optional star CTA; dashboard gates on auth and shows generate/existing-key; docs show how to call the API.
- Non-functional: responsive, accessible labels, no secret in client. Components < 200 LOC.

## Architecture
- `/` — server component. Hero (purpose), models list (MiniMax M3 now; "more coming"), 3-step how-it-works, soft "⭐ Star the repo" link to `NEXT_PUBLIC_REPO_URL` (purely optional copy: "star if it helps you"), sign-in CTA.
- `/dashboard` — auth-gated. If unauthenticated → prompt sign-in. If no key → "Generate my key" button (calls Phase 4 action) + soft star nudge. If key exists → masked hint + usage snippet. (No revoke/regenerate in v1.)
- `/docs` — static usage guide: base URL `https://openrouter.ai/api/v1`, `Authorization: Bearer <key>`, model id `minimax/minimax-m3`, curl + JS fetch examples, note on $10/day cap.

## Related Code Files
- Modify: `app/page.js` (landing)
- Create: `app/dashboard/page.js`
- Create: `app/docs/page.js`
- Create: `components/key-display.js` (one-time raw key + copy; masked thereafter — interactive)
- Create: `components/generate-key-panel.js` (interactive)
- Inline (NOT separate files): star nudge + how-it-works are static copy blocks — write as JSX directly in `page.js`/`dashboard`. Extract later only if a file nears 200 LOC.

## Implementation Steps
1. Landing page sections + soft star CTA (no gating), how-it-works inline.
2. Dashboard: auth check (redirect/prompt), wire generate-key panel to server action, one-time key display with copy button + prominent "shown once — copy now" warning.
3. Docs page with copy-paste examples for `minimax/minimax-m3`.
4. Basic styling (Tailwind or minimal CSS — keep deps lean).

## Success Criteria
- [ ] Landing clearly states purpose, model, how-it-works, optional star
- [ ] Dashboard gates on auth; generate works; key shown once with copy + prominent warning
- [ ] Existing-key state shows masked hint, not raw key
- [ ] Docs examples are correct and runnable against a real key
- [ ] Star CTA present but never blocks access

## Risk Assessment
- **One-time key UX confusion:** make the "copy now, shown once" warning prominent. No recovery path in v1 (revoke/regenerate is v2) — acceptable for a free key.
- **Accidental star-gating creep:** keep star strictly cosmetic — no code path checks star state (avoids GitHub AUP issue).
