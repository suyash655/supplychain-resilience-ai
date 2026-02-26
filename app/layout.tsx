import "./globals.css";
import type { Metadata } from "next";
import { ReactNode } from "react";
import {
  IBM_Plex_Sans_Condensed,
  JetBrains_Mono,
} from "next/font/google";

const plex = IBM_Plex_Sans_Condensed({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  variable: "--font-plex",
});

const mono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: "SynChain 2.0 — AI Supply Chain Intelligence",
  description:
    "Enterprise-grade AI-powered supply chain intelligence platform with ML, graph analytics, and generative AI reasoning.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className={`${plex.variable} ${mono.variable}`}>
        {children}
      </body>
    </html>
  );
}
