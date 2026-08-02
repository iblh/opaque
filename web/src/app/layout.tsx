import type { Metadata } from "next";
import { Newsreader, Inter, JetBrains_Mono } from "next/font/google";
import CookieBanner from "@/components/CookieBanner";
import ThemeWatcher from "@/components/ThemeWatcher";
import { THEME_INIT_SCRIPT } from "@/lib/theme";
import "./globals.css";

// The prototypes load Newsreader at 400/500 only (italic at 400). Pinning the
// same range keeps our rendering identical to theirs — left unbounded, next/font
// serves the full 200-800 variable axis and a `font-light` head renders at a
// genuine 300 where the prototype would clamp to 400.
const serif = Newsreader({
  subsets: ["latin"],
  weight: ["400", "500"],
  style: ["normal", "italic"],
  display: "swap",
  variable: "--font-serif",
});

const sans = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-sans",
});

const mono = JetBrains_Mono({
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
