import FaucetForm from "@/components/FaucetForm";
export const runtime = "edge";

export default function Home() {
  return (
    <div>
      <main className="flex min-h-screen flex-col items-center justify-between p-4 bg-slate-50">
        <div className="max-w-md w-full">
          <h1 className="text-3xl font-bold text-center mb-2" >Solana Devnet Faucet</h1>
          <p className="text-center text-gray-500 mb-8"> UKM Cryptoshield Faucet</p>
          <FaucetForm />
        </div>
      </main>
    </div>
  );
}
