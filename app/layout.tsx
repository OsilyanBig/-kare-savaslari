// app/layout.tsx
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Kare Savaşları - Strateji Oyunu",
  description: "Arkadaşlarınla kareli haritada ülkeler kur, ordular topla ve dünyayı fethet! Ortaokul efsanesi artık dijitalde.",
  keywords: "kare savaşları, strateji oyunu, multiplayer, online oyun, türkçe oyun",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr">
      <body className="bg-military-pattern min-h-screen">
        {/* Notification Container */}
        <div id="notification-root" />
        
        {/* Main Content */}
        {children}
      </body>
    </html>
  );
}