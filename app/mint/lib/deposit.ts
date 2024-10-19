import { Abi, createPublicClient, createWalletClient, custom, erc20Abi, http, PublicClient, WalletClient } from "viem";
import { mainnet, sepolia } from "viem/chains";
import TellerWithMultiAssetSupport from "../abis/TellerWithMultiAssetSupport.json";
import { calculateMinimumMint } from "../utils/calculateMinimumMint";
import { getRateInQuote } from "./getRateInQuote";
import { accountantAddress, boringVaultAddress, tellerAddress } from "../constants/contracts";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Deposits a specified amount of an asset using the Teller contract.
 *
 * @param params - The parameters for the deposit.
 * @param params.depositAsset - The token address of the asset to deposit.
 * @param params.depositAmount - The amount of the asset to deposit.
 * @param context - The context for the deposit.
 * @param context.userAddress - The address of the user making the deposit.
 * @param context.tellerContractAddress - The address of the Teller contract.
 * @param context.boringVaultAddress - The address of the Boring Vault.
 * @param context.accountantAddress - The address of the Accountant contract.
 * @returns - The transaction hash of the deposit.
 * @throws - Throws an error if the Ethereum provider is not available.
 */
export async function deposit(
  {
    depositAsset,
    depositAmount,
  }: {
    depositAsset: `0x${string}`;
    depositAmount: bigint;
  },
  {
    walletClient,
    publicClient,
  }: {
    walletClient: WalletClient;
    publicClient: PublicClient;
  }
) {
  try {
    ////////////////////////////////
    // Get User Address
    ////////////////////////////////
    const userAddress = (await walletClient.getAddresses())[0];
    if (!userAddress) {
      throw new Error("User address is not available");
    }

    ////////////////////////////////
    // Check Allowance
    ////////////////////////////////
    console.log("checking allowance...");
    const allowanceAsBigInt = await publicClient.readContract({
      abi: erc20Abi,
      address: depositAsset,
      functionName: "allowance",
      args: [userAddress, boringVaultAddress],
    });

    ////////////////////////////////
    // Approve
    ////////////////////////////////
    if (depositAmount > allowanceAsBigInt) {
      console.log("approving...");
      // Simulate the transaction to catch any errors
      const { request: approvalRequest } = await publicClient.simulateContract({
        abi: erc20Abi,
        address: depositAsset,
        functionName: "approve",
        args: [boringVaultAddress, depositAmount],
        account: userAddress,
      });

      // Execute the transaction
      const approvalTxHash = await walletClient.writeContract(approvalRequest);

      // Wait for the approval transaction to be confirmed
      await publicClient.waitForTransactionReceipt({
        hash: approvalTxHash,
        timeout: 60_000,
        confirmations: 1,
        pollingInterval: 10_000,
        retryCount: 5,
        retryDelay: 5_000,
      });
    }

    ////////////////////////////////
    // Calculate Minimum Mint
    ////////////////////////////////
    console.log("calculating minimum mint...");
    const rate = await getRateInQuote({ quote: depositAsset }, { publicClient });
    const minimumMint = calculateMinimumMint(depositAmount, rate);

    ////////////////////////////////
    // Deposit
    ////////////////////////////////
    console.log("depositing...");
    // Simulate the transaction to catch any errors
    const { request: depositRequest } = await publicClient.simulateContract({
      abi: TellerWithMultiAssetSupport.abi as Abi,
      address: tellerAddress,
      functionName: "deposit",
      args: [depositAsset, depositAmount, minimumMint],
      account: userAddress,
    });

    console.log("simulate passed");

    // Execute the transaction
    const depositTxHash = await walletClient.writeContract(depositRequest);

    // Wait for the deposit transaction to be confirmed
    await publicClient.waitForTransactionReceipt({
      hash: depositTxHash,
      timeout: 60_000,
      confirmations: 1,
      pollingInterval: 10_000,
      retryCount: 5,
      retryDelay: 5_000,
    });

    console.log("deposit complete!");
    console.log("depositTxHash", depositTxHash);

    return depositTxHash;
    // return "0x0";
  } catch (error) {
    console.error(error);
  }
}
