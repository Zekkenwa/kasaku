This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

# Kasaku

## Overview
Kasaku adalah web app untuk mengelola akun dan preferensi pengguna secara aman, termasuk autentikasi, pengaturan akun, dan alur penghapusan akun. Aplikasi ini dirancang untuk menyediakan dashboard sederhana dan alur login yang jelas bagi pengguna.

## Features
- Autentikasi pengguna (NextAuth).
- Dashboard pengguna.
- Halaman login.
- Pengaturan akun (account settings).
- Endpoint API untuk update akun dan request penghapusan.
- Cron job untuk pembersihan akun yang ditandai terhapus.

## Technical
- Next.js (App Router).
- NextAuth untuk autentikasi.
- Prisma untuk akses database & migrasi.
- Struktur route API di `app/api`.
- Manajemen halaman di `app/` (dashboard, login, account).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
