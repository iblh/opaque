import type { Metadata } from "next";
import { Geist, Geist_Mono, Sorts_Mill_Goudy } from "next/font/google";
import CookieBanner from "@/components/CookieBanner";
import ThemeWatcher from "@/components/ThemeWatcher";
import { THEME_INIT_SCRIPT } from "@/lib/theme";
import "./globals.css";

// Serif display face for titles / section headings.
const serif = Sorts_Mill_Goudy({
  subsets: ["latin"],
  weight: ["400"],
  style: ["normal", "italic"],
  display: "swap",
  variable: "--font-serif",
});

// Technical grotesk for prose/UI, and its companion mono for all data — the
// archival "spec sheet" voice. Replaces the system stacks so the dashboard has a
// consistent typographic personality across platforms.
const sans = Geist({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-sans",
});

const mono = Geist_Mono({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-mono",
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
  // suppressHydrationWarning on <html>: browser extensions (e.g. Immersive
  // Translate) and the pre-paint theme script mutate <html> attributes before
  // React hydrates. This suppresses only the <html> element's own attribute
  // diff, not any child-subtree mismatch.
  return (
    <html
      lang="en"
      className={`${serif.variable} ${sans.variable} ${mono.variable}`}
      suppressHydrationWarning
    >
      <head>
        {/* Apply the saved theme before first paint so there is no flash. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="min-h-screen text-text-primary antialiased">
        <ThemeWatcher />
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
