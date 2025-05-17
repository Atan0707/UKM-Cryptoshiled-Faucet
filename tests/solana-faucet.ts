import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { SolanaFaucet } from "../target/types/solana_faucet";
import { LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";
import { expect } from "chai";

describe("solana-faucet", () => {
  // Configure the client to use the devnet
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.SolanaFaucet as Program<SolanaFaucet>;
  const faucetWallet = (provider.wallet as anchor.Wallet).payer;

  // Create a new keypair for the recipient
  const recipientKeypair = anchor.web3.Keypair.generate();
  const recipientWallet = recipientKeypair.publicKey;

  // Amount to send (0.1 SOL)
  const airdropAmount = 0.1 * LAMPORTS_PER_SOL;

  // Fund the faucet wallet to ensure it has enough SOL
  before(async () => {
    console.log("Funding faucet wallet...");
    try {
      // Request 2 SOL for the faucet wallet
      const signature = await provider.connection.requestAirdrop(
        faucetWallet.publicKey,
        2 * LAMPORTS_PER_SOL
      );
      await provider.connection.confirmTransaction(signature);
      
      console.log(`Faucet wallet funded: ${faucetWallet.publicKey.toString()}`);
      
      // Check the balance to confirm
      const balance = await provider.connection.getBalance(faucetWallet.publicKey);
      console.log(`Faucet balance: ${balance / LAMPORTS_PER_SOL} SOL`);
    } catch (error) {
      console.error("Error funding faucet wallet:", error);
      throw error;
    }
  });

  it("Is initialized!", async () => {
    try {
      const tx = await program.methods.initialize().rpc();
      console.log("Initialization transaction signature:", tx);
    } catch (error) {
      console.error("Error during initialization:", error);
      throw error;
    }
  });

  it("Sends SOL to recipient", async () => {
    // Get initial balances
    const initialFaucetBalance = await provider.connection.getBalance(faucetWallet.publicKey);
    const initialRecipientBalance = await provider.connection.getBalance(recipientWallet);
    
    console.log(`Initial faucet balance: ${initialFaucetBalance / LAMPORTS_PER_SOL} SOL`);
    console.log(`Initial recipient balance: ${initialRecipientBalance / LAMPORTS_PER_SOL} SOL`);

    try {
      // Execute the send_sol instruction
      const tx = await program.methods
        .sendSol(new anchor.BN(airdropAmount))
        .accounts({
          faucet: faucetWallet.publicKey,
          recipient: recipientWallet,
          // @ts-ignore
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .rpc();

      console.log("Transaction signature:", tx);
      
      // Get final balances
      const finalFaucetBalance = await provider.connection.getBalance(faucetWallet.publicKey);
      const finalRecipientBalance = await provider.connection.getBalance(recipientWallet);
      
      console.log(`Final faucet balance: ${finalFaucetBalance / LAMPORTS_PER_SOL} SOL`);
      console.log(`Final recipient balance: ${finalRecipientBalance / LAMPORTS_PER_SOL} SOL`);

      // Verify balances changed correctly (accounting for transaction fees)
      // Recipient should receive the exact amount
      expect(finalRecipientBalance).to.equal(initialRecipientBalance + airdropAmount);
      
      // Faucet balance should decrease by at least the amount sent
      // (plus some for transaction fees)
      expect(finalFaucetBalance).to.be.lessThan(initialFaucetBalance - airdropAmount);
      
    } catch (error) {
      console.error("Error sending SOL:", error);
      throw error;
    }
  });

  it("Fails when trying to send more SOL than the faucet has", async () => {
    // Try to send more SOL than the faucet has
    const hugeAmount = 1000 * LAMPORTS_PER_SOL; // 1000 SOL
    
    try {
      await program.methods
        .sendSol(new anchor.BN(hugeAmount))
        .accounts({
          faucet: faucetWallet.publicKey,
          recipient: recipientWallet,
          // @ts-ignore
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .rpc();
      
      // If we get here, the test should fail
      expect.fail("Transaction should have failed due to insufficient funds");
    } catch (error) {
      // We expect an error here
      console.log("Got expected error when trying to send too much SOL");
      expect(error.toString()).to.include("insufficient funds");
    }
  });

  it("Can send SOL multiple times to the same recipient", async () => {
    const smallAmount = 0.01 * LAMPORTS_PER_SOL; // 0.01 SOL
    
    // Get initial balances
    const initialRecipientBalance = await provider.connection.getBalance(recipientWallet);
    
    try {
      // Send first transaction
      await program.methods
        .sendSol(new anchor.BN(smallAmount))
        .accounts({
          faucet: faucetWallet.publicKey,
          recipient: recipientWallet,
          // @ts-ignore
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .rpc();
      
      // Send second transaction
      await program.methods 
        .sendSol(new anchor.BN(smallAmount))
        .accounts({
          faucet: faucetWallet.publicKey,
          recipient: recipientWallet,
          // @ts-ignore
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .rpc();
      
      // Verify recipient received the funds from both transactions
      const finalRecipientBalance = await provider.connection.getBalance(recipientWallet);
      expect(finalRecipientBalance).to.equal(initialRecipientBalance + (smallAmount * 2));
      
      console.log("Successfully sent SOL multiple times to the same recipient");
    } catch (error) {
      console.error("Error in multiple transactions test:", error);
      throw error;
    }
  });
});
