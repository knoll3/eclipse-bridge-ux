import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { WalletClient, PublicClient, Address, parseUnits, parseEther, formatUnits } from "viem";
import { useDynamicContext } from "@dynamic-labs/sdk-react-core";
import { mainnet } from "viem/chains";
import { tokenAddresses } from "../constants/tokens";
import { getRateInQuote } from "../lib/getRateInQuote";
import { balanceOf } from "../lib/balanceOf";
import { useWallets } from "@/app/hooks";

type MintContextType = {
  walletClient: WalletClient | null;
  publicClient: PublicClient | null;
  exchangeRate: string;

  depositAmount: string;
  setDepositAmount: React.Dispatch<React.SetStateAction<string>>;

  depositAsset: `0x${string}`;
  setDepositAsset: React.Dispatch<React.SetStateAction<Address>>;

  depositPending: boolean;
  setDepositPending: React.Dispatch<React.SetStateAction<boolean>>;

  tokenBalance: string;
  tokenBalanceAsBigInt: bigint;
};

const MintContext = createContext<MintContextType | undefined>(undefined);

export function useMintContext() {
  const context = useContext(MintContext);
  if (context === undefined) {
    throw new Error("useMintContext must be used within a MintProvider");
  }
  return context;
}

interface MintProviderProps {
  children: ReactNode;
}

export const MintProvider = ({ children }: MintProviderProps) => {
  const { walletConnector } = useDynamicContext();
  const { evmWallet } = useWallets();
  const [walletClient, setWalletClient] = useState<WalletClient | null>(null);
  const [publicClient, setPublicClient] = useState<PublicClient | null>(null);
  const [depositAmount, setDepositAmount] = useState<string>("");
  const [depositAsset, setDepositAsset] = useState<`0x${string}`>(tokenAddresses[0]);
  const [exchangeRate, setExchangeRate] = useState<string>("");
  const [depositPending, setDepositPending] = useState<boolean>(false);
  const [tokenBalanceAsBigInt, setTokenBalanceAsBigInt] = useState<bigint>(BigInt(0));
  const [tokenBalance, setTokenBalance] = useState<string>("");

  // Set up the public and wallet clients
  useEffect(() => {
    async function loadClients() {
      if (!walletConnector) return;

      const fetchedWalletClient = walletConnector.getWalletClient(mainnet.id.toString()) as WalletClient;
      const fetchedPublicClient = (await walletConnector.getPublicClient()) as PublicClient;

      setWalletClient(fetchedWalletClient);
      setPublicClient(fetchedPublicClient);
    }

    loadClients();
  }, [walletConnector]);

  // Get an updated exchange rate every time the deposit asset changes and every 30 seconds after that.
  useEffect(() => {
    let isCancelled = false;

    async function getExchangeRate(asset: Address) {
      if (!asset || !publicClient) return;
      const rate = await getRateInQuote({ quote: asset }, { publicClient });

      // Only update if the asset hasn't changed
      if (!isCancelled && asset === depositAsset) {
        console.log("set exchange rate to ", rate.toString());
        setExchangeRate(rate.toString());
      }
    }

    getExchangeRate(depositAsset);

    // Get an updated exchange rate every 30 seconds
    const intervalId = setInterval(() => {
      getExchangeRate(depositAsset);
    }, 30_000);

    return () => {
      isCancelled = true;
      clearInterval(intervalId);
    };
  }, [depositAsset, publicClient]);

  // Get the token balance
  useEffect(() => {
    async function getTokenBalance() {
      if (!publicClient || !evmWallet) return;
      const tokenBalanceAsBigInt = await balanceOf({
        tokenAddress: depositAsset,
        userAddress: evmWallet.address as `0x${string}`,
        publicClient,
      });
      const formattedTokenBalance = formatUnits(tokenBalanceAsBigInt, 18);
      setTokenBalance(formattedTokenBalance);
      setTokenBalanceAsBigInt(tokenBalanceAsBigInt);
    }

    getTokenBalance();
  }, [depositAsset, evmWallet, publicClient]);

  return (
    <MintContext.Provider
      value={{
        walletClient,
        publicClient,
        depositAmount,
        setDepositAmount,
        depositAsset,
        setDepositAsset,
        exchangeRate,
        depositPending,
        setDepositPending,
        tokenBalance,
        tokenBalanceAsBigInt,
      }}
    >
      {children}
    </MintContext.Provider>
  );
};
