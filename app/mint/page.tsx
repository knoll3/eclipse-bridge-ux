"use client";
import useEthereumData from "@/lib/ethUtils";
import { SkeletonTheme } from "react-loading-skeleton";
import { Footer } from "../components/Footer";
import { Header } from "../components/Header";
import { TransactionProvider } from "../components/TransactionPool";
import { EthereumDataContext, WalletClientContext } from "../context";
import { useWalletClient } from "../hooks";
import Mint from "./components/Mint";
import { MintProvider } from "./contexts/MintContext";

function MintPage() {
  const walletClient = useWalletClient();

  return (
    <WalletClientContext.Provider value={walletClient}>
      <TransactionProvider>
        <MintProvider>
          <SkeletonTheme baseColor="#FFFFFF0A" highlightColor="#FFFFFF26">
            <div
              className="flex items-center text-white flex flex-col justify-between"
              id="main-content"
              style={{
                background: "black",
                transition: "filter 300ms var(--ease-out-quad)",
                height: "100%",
              }}
            >
              <Header />
              <div className="main-content flex flex-col gap-2 items-center">
                <Mint />
              </div>
              <Footer />
            </div>
          </SkeletonTheme>
        </MintProvider>
      </TransactionProvider>
    </WalletClientContext.Provider>
  );
}

export default MintPage;
