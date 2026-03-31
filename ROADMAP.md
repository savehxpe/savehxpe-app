# SAVEHXPE: Fan Monetization Toolkit / Artist OS Roadmap

**STATUS:** `V1-OUTWORLD IN PROGRESS`
**PLATFORM:** Next.js (App Router), Firebase (Auth, Firestore, Storage), Stripe, Vercel

The Savehxpe Artist OS is designed to be a Brutalist, highly-gamified digital ecosystem bridging artists and fans through an interconnected economy of XP, Credits, and physical/digital collectibles.

---

## 🗄 Phase 1: Core Systems & Infrastructure (Completed / Hardening)

- [x] **Brutalist Design System**: Monospace fonts, high-contrast layouts, heavy borders, and scanline/grid background effects.
- [x] **Firebase Integration**: Set up Auth, Firestore (User Data, XP, Collectibles), and Cloud Storage for assets.
- [x] **Identity / Authentication**: Fully custom `useAuth` hook bridging Firebase Auth with custom Firestore user documents (XP, Tier status).
- [x] **Secure Cloud Functions**: Deployed Vercel API routes to protect service accounts and manage server-side validation.

---

## 🎮 Phase 2: Engagement & Gamification (Active Development)

- [x] **XP & Credit Economy**: Users earn XP and Credits through engagement, syncing accounts, and playing arcade modules.
- [x] **Field Mode / Arcade (`CashCaliberEngine.tsx`)**: An interactive 114 BPM rhythm-reaction game module allowing fans to earn XP/Credits and trigger "Viral Streaks."
- [x] **Tiered Access System**: Users are grouped into Free, Standard, and Premium tiers, unlocking functionality map-wide.
- [x] **Onboarding Sequences**: Cinematic, lore-heavy introductory tutorials (`CitizenOnboarding`).
- [ ] **Collectibles Engine**: Finalising the distribution and UI showcasing of earned badges and virtual items.

---

## 🛒 Phase 3: Monetization & The Vault (Active Development)

- [x] **Gated Merch Store (`merch/page.tsx`)**: Products are conditionally gated behind User XP thresholds or Premium Tiers.
- [x] **Stripe Integration**: Secure checkout sessions mapped via Next.js `/api/checkout` API routes and Webhooks.
- [ ] **Physical + Digital Bundles**: Support physical merch drops tied to digital stems/downloads unlocked post-purchase.
- [ ] **Vault Audio Engine (`GatedStemsGrid.tsx`)**: Secure audio players that only serve tracks for users with correct XP or purchase history.

---

## 🚀 Phase 4: Launch & Scaling (Upcoming)

- [ ] **Legal Suite / Contract Vault**: Managing user records, signed EULAs, and privacy opt-ins natively.
- [ ] **Launch Checklist System**: Final functional checks prior to lifting the gates for general admission.
- [ ] **Mobile Optimisation Pass**: Finalising the brutalist layout for smaller screens and touch interactions on the Arcade modules.
- [ ] **SMS Blast Module**: Twilio/Resend integration allowing artists to push text updates to Premium fans.

---

> *"Build systems. Not just songs."* - Outworld LLC
