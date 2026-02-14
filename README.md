<div align="center">
  <img src="public/assets/banner.png" alt="Kasaku Banner" width="100%" />
  
# Kasaku
  
  **Modern Personal Finance Manager & WhatsApp Bot Integration**
  
  [![Next.js](https://img.shields.io/badge/Next.js-14-black?style=for-the-badge&logo=next.js&logoColor=white)](https://nextjs.org/)
  [![Prisma](https://img.shields.io/badge/Prisma-5-2d3748?style=for-the-badge&logo=prisma&logoColor=white)](https://www.prisma.io/)
  [![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-336791?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
  [![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
  [![Vercel](https://img.shields.io/badge/Vercel-Deploy-000000?style=for-the-badge&logo=vercel&logoColor=white)](https://vercel.com/)
  [![Railway](https://img.shields.io/badge/Railway-Deploy-0B0D0E?style=for-the-badge&logo=railway&logoColor=white)](https://railway.app/)

  [View Demo](https://kasaku.vercel.app/) • [Report Bug](https://github.com/Zekkenwa/kasaku/issues) • [Request Feature](https://github.com/Zekkenwa/kasaku/issues)
</div>

---

## 🚀 Overview

**Kasaku** is a comprehensive personal finance application designed to make money management simple, secure, and accessible. It combines a powerful **Web Dashboard** for detailed analysis with an integrated **WhatsApp Bot** for quick, on-the-go transaction recording.

Built with modern web technologies, Kasaku ensures your data is secure, synchronized in real-time between devices, and presented in a beautiful dark-mode interface.

## ✨ Features

### 💻 Web Dashboard

- **Comprehensive Overview**: Visualize your income, expenses, and net balance with interactive charts.
- **Wallet Management**: Track multiple wallets (Cash, Bank, E-Wallet) and transfer funds between them.
- **Transaction History**: Filterable list of all transactions with category breakdown.
- **Budgeting**: Set monthly budgets for specific categories and track progress.
- **Goal Setting**: Create savings goals and track your contributions.
- **Loan Tracking**: Manage debts and receivables (Hutang & Piutang) with payment history.
- **Recurring Transactions**: Automate regular income/expenses like salaries or subscriptions.

### 🤖 WhatsApp Bot Integration

- **Quick Input**: Record transactions instantly via chat (e.g., `/masuk 50000 Gaji`).
- **Reports**: Get instant daily/monthly financial summaries.
- **Authentication**: Secure OTP login via WhatsApp.
- **Real-time Sync**: Data entered via bot appears instantly on the dashboard.

### 🔒 Security

- **NextAuth.js**: Robust authentication system.
- **Google Integration**: Link/Unlink Google accounts securely.
- **OTP Verification**: Multi-factor authentication for sensitive actions (Password change, Email change).

## 📸 Screenshots

### 🖥️ Web Dashboard

<div align="center">
  <img src="public/assets/web-1.png" alt="Dashboard Top" width="100%" />
  <img src="public/assets/web-2.png" alt="Dashboard Routine" width="100%" />
  <img src="public/assets/web-3.png" alt="Dashboard Budget" width="100%" />
  <p><em>Comprehensive Financial Overview</em></p>
</div>

<br />

### 📱 Mobile Interface

<div align="center" style="display: flex; flex-wrap: wrap; justify-content: center; gap: 15px;">
  <img src="public/assets/mobile-1.png" alt="Target Tabungan" width="220" />
  <img src="public/assets/mobile-2.png" alt="Analisis Kategori" width="220" />
  <img src="public/assets/mobile-3.png" alt="Analisis Cashflow" width="220" />
  <img src="public/assets/mobile-4.png" alt="Hutang Piutang" width="220" />
</div>
<div align="center">
  <p><em>Responsive Design for On-the-Go Tracking</em></p>
</div>

## 🛠️ Tech Stack

- **Framework**: [Next.js 14](https://nextjs.org/)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **Database**: [PostgreSQL (Supabase)](https://supabase.com/)
- **ORM**: [Prisma](https://www.prisma.io/)
- **Auth**: [NextAuth.js](https://next-auth.js.org/)
- **Bot Engine**: [@whiskeysockets/baileys](https://github.com/WhiskeySockets/Baileys)

## 📦 Deployment

Kasaku is designed to be deployed on **Vercel** (for the web app) and **Railway** (for the WhatsApp bot).

### Web App (Vercel)

1. Fork this repository.
2. Import to Vercel.
3. Configure Environment Variables (`DATABASE_URL`, `NEXTAUTH_SECRET`, etc.).
4. Deploy!

### WhatsApp Bot (Railway)

1. Link repository to Railway.
2. Set `start:bot` as the custom start command.
3. Configure variables (`DATABASE_URL`, `PORT`).
4. Scan the QR code at `/qr` endpoint to connect.

See the full [Deployment Guide](deployment_guide.md) for detailed instructions.

## 🤝 Contributing

Contributions are always welcome!

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.

---

<div align="center">
  <p>Built with ❤️ by <a href="https://github.com/Zekkenwa">Zekkenwa</a></p>
</div>
