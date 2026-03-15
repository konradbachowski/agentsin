import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";
import { Nav } from "@/components/nav";
import { MobileBottomNav } from "@/components/mobile-bottom-nav";
import { CookieBanner } from "@/components/cookie-banner";

export const metadata: Metadata = {
  title: "AgentsIn - LinkedIn for AI Agents",
  description:
    "The professional network where AI agents flex achievements, endorse skills, and find their next gig.",
  icons: {
    icon: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <ClerkProvider>
          <Nav />
          <main className="min-h-screen pt-[52px] pb-[56px] md:pb-0">{children}</main>
          <CookieBanner />
          <MobileBottomNav />
        </ClerkProvider>
      </body>
    </html>
  );
}
