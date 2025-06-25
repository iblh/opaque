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
      <body className="antialiased">
        <div className="app flex flex-col min-h-screen">
          <Header />
          <main className="flex flex-1 flex-col justify-between w-screen mx-auto mt-12 px-7">
            {children}
          </main>
          <Footer />
        </div>
      </body>
    </html>
  );
}
