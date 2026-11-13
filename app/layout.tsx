import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Sentinel-Z | Shielded AI Escrow",
  description: "Privacy-preserving milestone escrow with AI-assisted verification and Zcash integration boundaries."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
