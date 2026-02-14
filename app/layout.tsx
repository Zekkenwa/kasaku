import "./globals.css";
import Providers from "./providers";
import { ThemeProvider } from "@/components/ThemeProvider";
import ThemeToggle from "@/components/ThemeToggle";

export const metadata = {
  title: "Kasaku",
  description: "Personal finance dashboard",
  icons: {
    icon: "/logo.ico",
    apple: "/logo.png",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body>
        <ThemeProvider>
          <Providers>{children}</Providers>
          <ThemeToggle />
        </ThemeProvider>
      </body>
    </html>
  );
}
