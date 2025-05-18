"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
// import { useToast } from "@/components/ui/use-toast";
import { PublicKey } from "@solana/web3.js";
import { toast } from "sonner";
import Confetti from "react-confetti";

export default function FaucetForm() {
  const [walletAddress, setWalletAddress] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const [txSignature, setTxSignature] = useState<string | null>(null);
//   const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!walletAddress) {
      toast.error("Please enter a wallet address");
      return;
    }
    
    try {
      setIsLoading(true);
      
      // Validate address
      try {
        new PublicKey(walletAddress);
      } catch (error) {
        toast.error("Invalid Solana wallet address: " + error);
        return;
      }
      
      // Call our API endpoint
      const response = await fetch('/api/faucet', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ walletAddress }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to request SOL');
      }
      
      toast.success(`0.1 SOL has been sent to your wallet on devnet. Tx: ${data.txSignature.slice(0, 8)}...`);
      setTxSignature(data.txSignature);
      setShowCelebration(true);
      
    } catch (error) {
      console.error("Error:", error);
      toast.error(error instanceof Error ? error.message : "Failed to request SOL");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {showCelebration && (
        <Confetti
          width={typeof window !== 'undefined' ? window.innerWidth : 300}
          height={typeof window !== 'undefined' ? window.innerHeight : 300}
          numberOfPieces={350}
          recycle={false}
        />
      )}
      <Dialog open={showCelebration} onOpenChange={setShowCelebration}>
        <DialogContent className="flex flex-col items-center">
          <DialogHeader>
            <DialogTitle>🎉 Congratulations!</DialogTitle>
            <DialogDescription>
              0.1 SOL has been sent to your wallet on devnet!
            </DialogDescription>
          </DialogHeader>
          <img src="/dancing.gif" alt="Dancing Celebration" className="w-48 h-48 mx-auto" />
          <audio src="/song.mp3" autoPlay loop className="my-4" />
          <DialogFooter>
            <Button
              onClick={() => {
                if (txSignature) {
                  window.open(`https://explorer.solana.com/tx/${txSignature}?cluster=devnet`, '_blank');
                }
                setShowCelebration(false);
              }}
              className="w-full"
            >
              View Transaction
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Card>
        <CardHeader>
          <CardTitle>Solana Devnet Faucet</CardTitle>
          <CardDescription>
            Enter your wallet address to receive 0.1 SOL on the Solana devnet network.
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Input
                placeholder="Solana Wallet Address"
                value={walletAddress}
                onChange={(e) => setWalletAddress(e.target.value)}
                className="w-full"
              />
              <p className="text-xs text-gray-500">
                *This faucet only works on Solana devnet
              </p>
            </div>
          </CardContent>
          <CardFooter>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Processing..." : "Request 0.1 SOL on Devnet"}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </>
  );
}