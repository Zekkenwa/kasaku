import "./globals.css";
import Providers from "./providers";

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
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
