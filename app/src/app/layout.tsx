import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";
import WalletContextProvider from "@/components/WalletContextProvider";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Solana NFT Faucet",
  description: "A simple NFT faucet on Solana devnet",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <WalletContextProvider>
          {children}
        </WalletContextProvider>
        <Toaster />
      </body>
    </html>
  );
}
