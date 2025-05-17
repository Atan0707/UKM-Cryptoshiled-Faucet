import { NextRequest, NextResponse } from 'next/server';
import { Connection, PublicKey, Keypair, LAMPORTS_PER_SOL, Transaction, VersionedTransaction } from '@solana/web3.js';
import { AnchorProvider, BN, Program } from '@coral-xyz/anchor';
import idl from '@/lib/solana_faucet.json';
import { bs58 } from '@coral-xyz/anchor/dist/cjs/utils/bytes';
export const runtime = 'edge';

const FAUCET_PRIVATE_KEY = process.env.FAUCET_PRIVATE_KEY;
// const PROGRAM_ID = new PublicKey('2xySGyY8E5Wfnggfap9jfQ2WbH3T3tLGHGwLk4eKBa64');
// Use devnet endpoint only
const DEVNET_URL = 'https://api.devnet.solana.com';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { walletAddress } = body;

    if (!walletAddress) {
      return NextResponse.json({ error: 'Wallet address is required' }, { status: 400 });
    }

    if (!FAUCET_PRIVATE_KEY) {
      return NextResponse.json({ error: 'Faucet private key not configured' }, { status: 500 });
    }

    // Parse the recipient wallet address
    let recipient;
    try {
      recipient = new PublicKey(walletAddress);
    } catch (error) {
      return NextResponse.json({ error: 'Invalid wallet address: ' + error }, { status: 400 });
    }

    // Set up connection to Solana devnet only
    const connection = new Connection(DEVNET_URL, 'confirmed');

    // Create keypair from private key
    const keypairBytes = bs58.decode(FAUCET_PRIVATE_KEY);
    const faucetKeypair = Keypair.fromSecretKey(new Uint8Array(keypairBytes));

    // Check if faucet has enough SOL
    const faucetBalance = await connection.getBalance(faucetKeypair.publicKey);
    const requestAmount = 0.1 * LAMPORTS_PER_SOL; // 0.1 SOL

    if (faucetBalance < requestAmount) {
      return NextResponse.json(
        { error: 'Faucet does not have enough SOL on devnet' },
        { status: 400 }
      );
    }

    // Create anchor provider with custom wallet implementation
    const customWallet = {
      publicKey: faucetKeypair.publicKey,
      signTransaction: async <T extends Transaction | VersionedTransaction>(tx: T): Promise<T> => {
        if (tx instanceof Transaction) {
          tx.partialSign(faucetKeypair);
        }
        // For VersionedTransaction, do nothing (assume already signed or handled elsewhere)
        return tx;
      },
      signAllTransactions: async <T extends Transaction | VersionedTransaction>(txs: T[]): Promise<T[]> => {
        return txs.map((tx: T) => {
          if (tx instanceof Transaction) {
            tx.partialSign(faucetKeypair);
          }
          return tx;
        });
      },
    };
    const provider = new AnchorProvider(
      connection,
      customWallet,
      { commitment: 'confirmed' }
    );

    // Initialize the program
    const program = new Program(idl, provider);

    // Send SOL to the recipient
    const tx = await program.methods
      .sendSol(new BN(requestAmount))
      .accounts({
        faucet: faucetKeypair.publicKey,
        recipient: recipient,
        systemProgram: PublicKey.default,
      })
      .signers([faucetKeypair])
      .rpc();

    return NextResponse.json({
      success: true,
      txSignature: tx,
      network: 'devnet',
      message: `Successfully sent 0.1 SOL to ${walletAddress} on devnet`,
    });
  } catch (error) {
    console.error('Faucet error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error occurred' },
      { status: 500 }
    );
  }
}