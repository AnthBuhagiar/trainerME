import type { Metadata } from "next";
import { IBM_Plex_Sans, JetBrains_Mono, Saira } from "next/font/google";
import "./admin.css";

// The website's type: Saira for headings, IBM Plex Sans for text, JetBrains Mono for numbers.
const saira = Saira({ variable: "--font-saira", subsets: ["latin"], axes: ["wdth"], style: ["normal", "italic"] });
const plex = IBM_Plex_Sans({ variable: "--font-plex", subsets: ["latin"], weight: ["400", "500", "600"] });
const mono = JetBrains_Mono({ variable: "--font-mono", subsets: ["latin"], weight: ["400", "600"] });

export const metadata: Metadata = { title: "Hour Power admin", robots: { index: false, follow: false } };

export default function AdminLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <div className={`${saira.variable} ${plex.variable} ${mono.variable}`}>{children}</div>;
}
