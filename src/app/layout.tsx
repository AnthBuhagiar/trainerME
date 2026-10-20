import type { Metadata, Viewport } from "next";
import { Archivo, Inter } from "next/font/google";
import { BottomNav } from "@/components/BottomNav";
import "./globals.css";

const archivo = Archivo({ variable: "--font-archivo", subsets: ["latin"], axes: ["wdth"] });
const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Hour Power",
  description: "Your hour power, estimated from every ride.",
};

export const viewport: Viewport = {
  themeColor: "#12161C",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${archivo.variable} ${inter.variable} antialiased pb-20`}>
        {children}
        <BottomNav />
      </body>
    </html>
  );
}
