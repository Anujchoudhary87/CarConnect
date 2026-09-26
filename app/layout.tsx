import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { MobileTabBar } from "@/components/MobileTabBar";
import { SetupNotice } from "@/components/SetupNotice";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Car Connect – Paas Ki Used Cars | Kharido & Becho",
    template: "%s | Car Connect",
  },
  description:
    "India ka simple used-car marketplace — local dealers aur customers ke liye. Paas ki gaadiyaan dhoondho, apni car becho, aur verified dealers se judo.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col pb-[calc(4.25rem+env(safe-area-inset-bottom))] lg:pb-0">
        <SetupNotice />
        <Header />
        <main className="flex-1">{children}</main>
        <Footer />
        <MobileTabBar />
      </body>
    </html>
  );
}