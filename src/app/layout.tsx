import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "react-hot-toast";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "DSD Management - Professionelle Eventtechnik zur Miete",
  description: "Zuverlässige und flexible Vermietung von Sound- und Lichttechnik für B2B- und B2C-Kunden in der Schweiz.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="de">
      <body className={`${inter.variable} font-sans antialiased bg-white text-gray-900`}>
        {children}
        <Toaster position="top-right" />
      </body>
    </html>
  );
}
