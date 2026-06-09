import type { Metadata } from "next";
import { Sorts_Mill_Goudy } from "next/font/google";
import CookieBanner from "@/components/CookieBanner";
import "./globals.css";

// Serif display face for titles / section headings. Body text stays sans.
const serif = Sorts_Mill_Goudy({
  subsets: ["latin"],
  weight: ["400"],
  style: ["normal", "italic"],
  display: "swap",
  variable: "--font-serif",
});

export const metadata: Metadata = {
  title: "OPAQUE",
  description: "A quiet dashboard for bookmarks, applications, and servers",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={serif.variable}>
      <body className="min-h-screen bg-background text-text-primary antialiased">
        <div className="flex min-h-screen flex-col">
          <main className="relative flex-1">
            {children}
          </main>
          <CookieBanner />
        </div>
      </body>
    </html>
  );
}
