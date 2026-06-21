import type { Metadata } from "next";
import "./globals.css";

const displayFont = {
  variable: "display-font-loaded",
};

const bodyFont = {
  variable: "body-font-loaded",
};

const monoFont = {
  variable: "mono-font-loaded",
};

export const metadata: Metadata = {
  title: "CertMint | NFT-backed Certificate Minter & Verifier on Stellar",
  description:
    "CertMint  mints & verifies NFT-backed certificates on Stellar with public, tamper-aware authenticity checks.",
  icons: {
    icon: "/logo.png",
    shortcut: "/logo.png",
    apple: "/logo.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${displayFont.variable} ${bodyFont.variable} ${monoFont.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
