"use client";

import { FC, useState, useEffect } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import { generateSigner, percentAmount, publicKey } from "@metaplex-foundation/umi";
import type { Umi } from "@metaplex-foundation/umi";
import { createNft, mplTokenMetadata, findMetadataPda, verifyCollectionV1, updateV1, collectionToggle } from "@metaplex-foundation/mpl-token-metadata";
import { walletAdapterIdentity } from "@metaplex-foundation/umi-signer-wallet-adapters";
// import { Metaplex } from "@metaplex-foundation/js";
import { utils } from "@coral-xyz/anchor";
import dynamic from "next/dynamic";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import Image from "next/image";
import { Connection, clusterApiUrl } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID } from "@coral-xyz/anchor/dist/cjs/utils/token";

const WalletMultiButton = dynamic(
  () => import("@solana/wallet-adapter-react-ui").then(mod => mod.WalletMultiButton),
  { ssr: false }
);

// Admin configuration
const ADMIN_WALLET = "GsjREUyUEkFRAhoSj1q9Tg4tPGCyoEAoTyFiZjqxKD92";
// const connection = new Connection(clusterApiUrl("devnet"));
// const metaplex = Metaplex.make(connection);

// NFT metadata constant
const NFT_METADATA = {
  name: "UKM NFT",
  symbol: "UKM",
  description: "A special NFT for UKM Cryptoshield",
  image: "https://plum-tough-mongoose-147.mypinata.cloud/ipfs/bafybeielm6axhykmeaoromfbm564vq46ugjagz7u45gyhtpp4k4azu5tqe",
  attributes: [
    {
      trait_type: "Organization",
      value: "UKM"
    },
    {
      trait_type: "Type",
      value: "Cryptoshield"
    }
  ]
};

// Collection configuration
const COLLECTION_CONFIG = {
  maxSupply: 100, // Maximum number of NFTs that can be minted
  collectionName: "UKM NFT Collection",
  collectionSymbol: "UKMC",
  collectionDescription: "Collection of UKM Cryptoshield NFTs",
};

interface AssetGrouping {
  group_key: string;
  group_value: string;
  verified?: boolean;
}

interface Asset {
  id: string;
  grouping: AssetGrouping[];
}

const NFTPage: FC = () => {
  const wallet = useWallet();
  const [isLoading, setIsLoading] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [mintedCount, setMintedCount] = useState(0);
  const [collectionMint, setCollectionMint] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showMintingDialog, setShowMintingDialog] = useState(false);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const isAdmin = wallet.publicKey?.toString() === ADMIN_WALLET;
  const COLLECTION_MINT_ADDRESS = "5n2dS25T554sWBffxmfNa3FbtfFi8nZLXBq5uJPa3bRg";

//   const getTotalNFTsInCollection = async () => {
//     try {
//       const collectionPubkey = new PublicKey(COLLECTION_MINT_ADDRESS);
      
//       // Find all NFTs in the collection
//       const nfts = await metaplex.nfts().findAllByCollection({
//         collection: collectionPubkey
//       });
      
//       return nfts.length;
//     } catch (error) {
//       console.error("Error fetching collection NFTs:", error);
//       return 0;
//     }
//   }

//   useEffect(() => {
//     getTotalNFTsInCollection();
//   }, []);

async function getTotalNFTsViaProgramAccounts() {
    const connection = new Connection(clusterApiUrl("devnet"));
    
    try {
      const accounts = await connection.getProgramAccounts(TOKEN_PROGRAM_ID, {
        filters: [
          {
            dataSize: 165, // Token account data size
          },
          {
            memcmp: {
              offset: 0,
              bytes: COLLECTION_MINT_ADDRESS, // Filter by collection
            },
          },
        ],
      });
      console.log("Accounts:", accounts);
      return accounts.length;

    } catch (error) {
      console.error("Error fetching via program accounts:", error);
      return 0;
    }
  }

  useEffect(() => {
    getTotalNFTsViaProgramAccounts();
  }, []);

  const fetchMintedCount = async () => {
    try {


      if (COLLECTION_MINT_ADDRESS) {
        // Make a direct API call to Helius
        const response = await fetch('https://devnet.helius-rpc.com/?api-key=6501308f-4d5a-4424-b0e4-3473208db95a', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            jsonrpc: '2.0',
            id: 'my-id',
            method: 'getAssetsByGroup',
            params: {
              groupKey: "collection",
              groupValue: COLLECTION_MINT_ADDRESS,
              page: 1,
              limit: 1000
            }
          })
        });

        const data = await response.json();
        console.log("Data:", data);

        if (data.result && data.result.items) {
          // Count only verified NFTs in the collection
          const verifiedCount = data.result.items.filter((asset: Asset) => 
            asset.grouping.find(g => 
              g.group_key === "collection" && 
              g.group_value === COLLECTION_MINT_ADDRESS && 
              g.verified === true
            )
          ).length;

          setMintedCount(verifiedCount);
        } else {
          console.log("No items found in collection");
          setMintedCount(0);
        }
      }
    } catch (err) {
      console.error("Error fetching minted count:", err);
      setMintedCount(0);
    }
  };

  useEffect(() => {
    setMounted(true);
    // Initialize and check for existing collection
    const initializeCollection = async () => {
      if (!wallet.publicKey) return;
      
      try {
        // Initialize Umi
        const umi = createUmi(clusterApiUrl("devnet"))
          .use(walletAdapterIdentity(wallet))
          .use(mplTokenMetadata());

        // Rest of your existing initialization code...
        const COLLECTION_MINT_ADDRESS = "5n2dS25T554sWBffxmfNa3FbtfFi8nZLXBq5uJPa3bRg";
        
        if (COLLECTION_MINT_ADDRESS) {
          try {
            const [metadataPda] = findMetadataPda(umi, {
              mint: publicKey(COLLECTION_MINT_ADDRESS),
            });

            const metadataAccount = await umi.rpc.getAccount(metadataPda);
            
            if (metadataAccount.exists) {
              setCollectionMint(COLLECTION_MINT_ADDRESS);
              console.log("Collection found and set:", COLLECTION_MINT_ADDRESS);
              console.log("Metadata account:", metadataAccount);
            } else {
              console.log("Collection metadata account does not exist");
              if (isAdmin) {
                // If admin and collection doesn't exist, create it
                await handleCreateCollection();
              }
            }
          } catch (error) {
            console.log("Error fetching collection metadata:", error instanceof Error ? error.message : "Unknown error");
            if (isAdmin) {
              // If admin and there was an error, try to create collection
              await handleCreateCollection();
            }
          }
        }

        // Fetch the minted count after collection is initialized
        await fetchMintedCount();
      } catch (err) {
        console.error("Error checking collection:", err);
      }
    };

    initializeCollection();
  }, [wallet.publicKey, isAdmin]);

  const handleCreateCollection = async () => {
    if (!wallet.publicKey) return;

    try {
      setIsLoading(true);
      setError(null);

      // Initialize Umi with wallet adapter identity
      const umi = createUmi(clusterApiUrl("devnet"))
        .use(walletAdapterIdentity(wallet))
        .use(mplTokenMetadata());

      await createCollection(umi);
      
    } catch (error) {
      console.error("Error creating collection:", error);
      setError(error instanceof Error ? error.message : "Failed to create collection");
    } finally {
      setIsLoading(false);
    }
  };

  const createCollection = async (umi: Umi) => {
    if (!wallet.publicKey) return null;
    
    // Return existing collection if it exists
    if (collectionMint) {
      return publicKey(collectionMint);
    }

    // Only admin can create new collection
    if (!isAdmin) {
      throw new Error("Collection not created yet. Please wait for admin to create it.");
    }

    const collectionMintKeypair = generateSigner(umi);
    
    // First create the collection NFT without verification
    await createNft(umi, {
      mint: collectionMintKeypair,
      name: COLLECTION_CONFIG.collectionName,
      symbol: COLLECTION_CONFIG.collectionSymbol,
      uri: NFT_METADATA.image,
      sellerFeeBasisPoints: percentAmount(0),
      isCollection: true,
    }).sendAndConfirm(umi);

    console.log("Created collection with mint address:", collectionMintKeypair.publicKey.toString());
    
    setCollectionMint(collectionMintKeypair.publicKey.toString());
    return collectionMintKeypair.publicKey;
  };

  const mintNFT = async () => {
    if (!wallet.publicKey) return;

    try {
      setIsLoading(true);
      setError(null);
      setShowMintingDialog(true);

      // Initialize Umi with wallet adapter identity
      const umi = createUmi(clusterApiUrl("devnet"))
        .use(walletAdapterIdentity(wallet))
        .use(mplTokenMetadata());

      // Get or create collection
      const collectionPublicKey = await createCollection(umi);
      
      if (!collectionPublicKey) {
        throw new Error("Failed to get collection");
      }

      // Generate mint address for the new NFT
      const mint = generateSigner(umi);

      // Create NFT with collection
      const { signature } = await createNft(umi, {
        mint,
        name: `${NFT_METADATA.name} #${mintedCount + 1}`,
        symbol: NFT_METADATA.symbol,
        uri: NFT_METADATA.image,
        sellerFeeBasisPoints: percentAmount(0),
        collection: {
          key: collectionPublicKey,
          verified: false
        },
      }).sendAndConfirm(umi);

      // After creating the NFT, verify it as part of the collection
      const metadata = findMetadataPda(umi, { mint: mint.publicKey });
      
      // First set the collection
      await updateV1(umi, {
        mint: mint.publicKey,
        authority: umi.identity,
        collection: collectionToggle("Set", [
          {
            key: collectionPublicKey,
            verified: false,
          },
        ]),
      }).sendAndConfirm(umi);

      // Then verify the collection
      if (isAdmin) {
        await verifyCollectionV1(umi, {
          metadata,
          collectionMint: collectionPublicKey,
          authority: umi.identity,
        }).sendAndConfirm(umi);
      }

      // Convert signature to base58 string
      setTxHash(utils.bytes.bs58.encode(signature));
      
      // Update minted count
      setMintedCount(prev => prev + 1);
      
      setShowMintingDialog(false);
      setShowSuccessDialog(true);
      
    } catch (error) {
      console.error("Error minting NFT:", error);
    //   setError(error instanceof Error ? error.message : "Failed to mint NFT");
      setShowMintingDialog(false);
    } finally {
      setIsLoading(false);
    }
  };

  if (!mounted) {
    return null;
  }

  return (
    <div>
      <main className="flex min-h-screen flex-col items-center justify-between p-4 bg-slate-50">
        <div className="max-w-xl w-full">
          <h1 className="text-3xl font-bold text-center mb-2">Mint Your UKM NFT</h1>
          <p className="text-center text-gray-500 mb-8">UKM Cryptoshield NFT Minting ({mintedCount}/{COLLECTION_CONFIG.maxSupply} minted)</p>
          
          {isAdmin && !collectionMint && (
            <Card className="mb-4">
              <CardHeader>
                <CardTitle>Admin Controls</CardTitle>
                <CardDescription>
                  Initialize the NFT collection
                </CardDescription>
              </CardHeader>
              <CardContent>
                <button
                  onClick={handleCreateCollection}
                  disabled={isLoading}
                  className="w-full py-2 px-4 bg-purple-500 text-white rounded-md hover:bg-purple-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? "Creating Collection..." : "Create Collection"}
                </button>
              </CardContent>
            </Card>
          )}

          <div className="flex flex-col items-center gap-4">
            <WalletMultiButton className="!bg-blue-500 hover:!bg-blue-600" />
            
            {error && (
              <p className="text-red-500 text-center">{error}</p>
            )}

            {wallet.publicKey ? (
              <button
                onClick={mintNFT}
                disabled={isLoading || mintedCount >= COLLECTION_CONFIG.maxSupply || (!collectionMint && !isAdmin)}
                className="w-full py-2 px-4 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? "Minting..." : 
                 mintedCount >= COLLECTION_CONFIG.maxSupply ? "Sold Out" : 
                 !collectionMint ? "Waiting for Collection Setup" : 
                 "Mint NFT"}
              </button>
            ) : (
              <p className="text-center text-gray-500">Connect your wallet to mint NFTs</p>
            )}
          </div>

          {/* Minting Dialog */}
          <Dialog open={showMintingDialog} onOpenChange={setShowMintingDialog}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Minting in Progress</DialogTitle>
                <DialogDescription>
                  Please wait while your NFT is being minted. This process may take a few moments.
                </DialogDescription>
              </DialogHeader>
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-500"></div>
              </div>
            </DialogContent>
          </Dialog>

          {/* Success Dialog */}
          <Dialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>NFT Minted Successfully!</DialogTitle>
                <DialogDescription>
                  Your UKM NFT has been successfully minted to your wallet.
                </DialogDescription>
              </DialogHeader>
              <div className="flex flex-col items-center gap-4 py-4">
                <div className="relative w-full aspect-square rounded-lg overflow-hidden max-w-xs mx-auto">
                  <Image
                    src={NFT_METADATA.image}
                    alt={NFT_METADATA.name}
                    fill
                    className="object-cover"
                    priority
                  />
                </div>
                <div className="text-center">
                  <h3 className="font-semibold mb-2">{`${NFT_METADATA.name} #${mintedCount}`}</h3>
                  <p className="text-sm text-gray-500 mb-4">{NFT_METADATA.description}</p>
                  {txHash && (
                    <a 
                      href={`https://explorer.solana.com/tx/${txHash}?cluster=devnet`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-500 hover:underline"
                    >
                      View on Explorer
                    </a>
                  )}
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </main>
    </div>
  );
};

export default NFTPage;
