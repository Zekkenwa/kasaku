# Changelog

All notable changes to **Kasaku** will be documented in this file.

---

## v3.12 — Code Cleanup & Documentation (2026-02-25)

- Removed unnecessary inline comments and thinking-out-loud notes across the codebase.
- Added proper JSDoc documentation headers to core modules (`prisma.ts`, `gamification.ts`, `otp-rate-limit.ts`).
- Created this `CHANGELOG.md` for version tracking.
- Updated `README.md` with comprehensive feature list.
- Updated Syarat & Ketentuan page with AI data processing disclosure.

## v3.11 — Encryption Audit & Data Flow Scan (2026-02-25)

- **Fixed** critical double-encryption bug in `account/phone/change` — phone was encrypted manually before Prisma middleware also encrypted it.
- **Removed** redundant manual `decrypt()` call in `auth/register/resend` — Prisma middleware already decrypts fields on reads.
- **Removed** broken encrypted phone fallback search in `auth/otp/request` and `whatsapp-bot-logic.ts` — AES-256-GCM uses random IVs, making direct ciphertext comparison impossible.

## v3.10 — OTP Category Cooldowns (2026-02-25)

- Created `OtpRateLimit` Prisma model to store cooldown state per user per feature category.
- Refactored `lib/otp-rate-limit.ts` to accept a `category` parameter (`LOGIN`, `PASSWORD`, `EMAIL`, `PHONE`, `VERIFY`, `REGISTER`).
- Updated all 8 OTP API routes to pass their respective category strings.
- Requesting OTP for login no longer blocks OTP for password change (and vice versa).

## v3.9 — Account Deletion Flow (2026-02-25)

- Connected "Hapus Akun" button to `/api/account/request-delete` endpoint.
- Added red warning banner for accounts pending deletion with scheduled date display.
- Created `/api/account/cancel-delete` API route for 1-click deletion cancellation.
- Auto sign-out after deletion request, 3-day grace period before permanent removal.

## v3.8 — Backend Optimization & High-Traffic Security (2026-02-25)

- Implemented AES-256-GCM key caching in `lib/encryption.ts` to avoid redundant `Buffer` allocations.
- Adjusted Prisma connection limits to `connection_limit=15&pool_timeout=30` for serverless environments.
- Added `try-catch` boundary around WhatsApp bot message loop to prevent isolated errors from crashing the runtime.

## v3.7 — AI Integration & UX Polish

- Added `walletName` property to AI schema for wallet-aware transaction parsing.
- Implemented fuzzy wallet matching in bot logic with `PendingBotTransaction` fallback for multi-wallet users.
- Fixed duplicated AI success message formatting with RegEx sanitization.

## v3.6 — Multi-Wallet System

- Introduced wallet management (Cash, Bank, E-Wallet) with per-wallet balance tracking.
- Added inter-wallet transfer functionality.
- Integrated wallet selection into transaction forms and bot commands.

## v3.5 — Gamification Engine

- Implemented streak tracking with freeze day mechanics.
- Added 20 achievement badges with progress tracking.
- Introduced Financial Health Score (savings, budget, debt, goals).

## v3.4 — Recurring Transactions

- Added recurring transaction support (Daily, Weekly, Monthly).
- Cron-based automatic execution with cash flow logging.
- UI for managing routines in the dashboard.

## v3.3 — Goals & Savings Targets

- Added savings goal creation and tracking.
- Fund goals via dashboard or WhatsApp bot.
- Visual progress bars with percentage completion.

## v3.2 — Loan & Debt Management

- Hutang (Payable) and Piutang (Receivable) tracking.
- Payment history with partial payment support.
- Bot commands for debt creation and repayment.

## v3.1 — Budget System

- Category-based budget limits with progress tracking.
- Over-budget alerts and visual indicators.
- Multiple period types (Once, Daily, Weekly, Monthly, Yearly).

## v3.0 — WhatsApp Bot

- AI-powered natural language transaction parsing via Gemini 2.5 Flash.
- OTP authentication via WhatsApp.
- Command-based income/expense recording, reports, and category management.
- Real-time sync between bot and web dashboard.

## v2.0 — Dashboard & Security

- Interactive dashboard with Chart.js visualizations.
- AES-256-GCM field-level encryption for sensitive data.
- HMAC-SHA256 blind indexing for searchable encrypted fields.
- Google OAuth and credential-based authentication via NextAuth.js.

## v1.0 — Initial Release

- Core transaction recording (income/expense).
- Category management.
- PostgreSQL database with Prisma ORM.
- Next.js web application with dark mode UI.
