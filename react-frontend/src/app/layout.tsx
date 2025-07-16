import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "OPAQUE",
  description: "A mindful space for creators",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-background text-text-primary antialiased">
        <div className="flex h-screen flex-col">
          <main className="relative flex-1 overflow-hidden">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
