import { useWallets } from "@/app/hooks";
import classNames from "classnames";
import { useState } from "react";
import { formatUnits, parseEther, parseUnits } from "viem";
import { tokenOptions } from "../constants/tokens";
import { useMintContext } from "../contexts/MintContext";
import { deposit } from "../lib/deposit";
import { sanitizeInput } from "../utils/sanitizeInput";
import { MintValueCard } from "./MintValueCard";
import "./styles.css";
import { TokenOption } from "./TokenSelect";

export enum Tabs {
  Mint,
  Redeem,
}

function Mint() {
  const mintState = useMintContext();
  const {
    walletClient,
    publicClient,
    depositAmount,
    depositAsset,
    setDepositAmount,
    setDepositAsset,
    exchangeRate,
    depositPending,
    setDepositPending,
    tokenBalance,
    tokenBalanceAsBigInt,
  } = mintState;
  const [activeTab, setActiveTab] = useState<Tabs>(Tabs.Mint);
  const { evmWallet, solWallet } = useWallets();

  ///////////////////
  // Derived values
  ///////////////////
  const depositAmountAsBigInt = parseUnits(depositAmount, 18);
  const exchangeRateAsBigInt = BigInt(exchangeRate);
  const receiveAmountAsBigInt =
    exchangeRateAsBigInt > BigInt(0)
      ? (depositAmountAsBigInt * BigInt(1e18)) / exchangeRateAsBigInt
      : depositAmountAsBigInt;
  const formattedReceiveAmount = formatUnits(receiveAmountAsBigInt, 18);

  const isMintDisabled = depositPending || !depositAmount || !depositAsset || !evmWallet;

  const isOverBalance = tokenBalanceAsBigInt < depositAmountAsBigInt;

  ///////////////////
  // Actions
  ///////////////////
  async function handleMint() {
    if (isMintDisabled) return;
    try {
      setDepositPending(true);
      if (!walletClient || !publicClient) {
        throw new Error("Wallet client or public client is not available");
      }

      const depositAmountAsBigInt = parseEther(depositAmount);

      const depositTxHash = await deposit(
        { depositAsset, depositAmount: depositAmountAsBigInt },
        { walletClient, publicClient }
      );
      console.log("depositTxHash", depositTxHash);
    } catch (error) {
      console.error(error);
    } finally {
      setDepositPending(false);
    }
  }

  function handleDepositAmountChange(val: string) {
    const sanitizedInput = sanitizeInput(val, depositAmount);
    setDepositAmount(sanitizedInput);
  }

  function handleDepositAssetChange(val: TokenOption) {
    setDepositAsset(val.value);
  }

  return (
    <div>
      <div className="deposit-container flex flex-col">
        <div className="deposit-card">
          <div className="header-tabs">
            <div
              className={classNames("header-tab", activeTab === Tabs.Mint ? "active" : "inactive")}
              style={{ width: "100%" }}
              onClick={() => setActiveTab(Tabs.Mint)}
            >
              Mint
            </div>
            <div
              className={classNames("header-tab", "disabled", activeTab === Tabs.Redeem ? "active" : "inactive")}
              style={{ width: "100%" }}
            >
              Redeem
            </div>
          </div>
          {activeTab === Tabs.Mint && (
            <div className="flex flex-col gap-3">
              <MintValueCard
                title="Deposit from"
                chainName="Ethereum"
                chainIconImg="/eth.png"
                userAddress={evmWallet?.address}
                inputValue={depositAmount}
                onChangeInput={handleDepositAmountChange}
                depositAsset={tokenOptions.find((token) => token.value === depositAsset)}
                onChangeDepositAsset={handleDepositAssetChange}
                isOverBalance={isOverBalance}
              />
              <MintValueCard
                title="Receive on"
                chainName="Eclipse"
                chainIconImg="/eclipse.png"
                userAddress={solWallet?.address}
                inputValue={formattedReceiveAmount}
                disabled={true}
                depositAsset={{
                  value: "0xtETH-solana",
                  label: "tETH",
                  imageSrc: "/token-teth.svg",
                }}
              />
            </div>
          )}
          {activeTab === Tabs.Redeem && <div>Redeem</div>}
          <button
            className={classNames("mint-button mt-3", { "mint-button-disabled": isMintDisabled })}
            onClick={handleMint}
            disabled={isMintDisabled}
          >
            {depositPending ? "Minting..." : "Mint"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default Mint;
