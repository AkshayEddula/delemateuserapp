import type { Metadata } from "next";
import { Lexend } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import Navbar from "@/components/Navbar";
import MobileBottomNav from "@/components/MobileBottomNav";
import FirstTimeUserWrapper from "@/components/FirstTimeUserWrapper";

const lexend = Lexend({
  variable: "--font-lexend",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Delemate - Package Delivery",
  description: "Fast and reliable package delivery service",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${lexend.variable} antialiased`}
      >
        <AuthProvider>
          <FirstTimeUserWrapper>
            <Navbar />
            <main className="min-h-screen pb-16 md:pb-0">{children}</main>
            <MobileBottomNav />
          </FirstTimeUserWrapper>
        </AuthProvider>
      </body>
    </html>
  );
}
