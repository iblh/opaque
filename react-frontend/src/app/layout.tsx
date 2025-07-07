import type { Metadata } from "next";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

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
      <body className="antialiased bg-white">
        <div className="app flex flex-col h-screen">
          <Header />
          <main className="flex-1 relative">
            {children}
          </main>
          <Footer />
        </div>
      </body>
    </html>
  );
}
