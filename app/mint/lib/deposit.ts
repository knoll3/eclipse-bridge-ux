import { Abi, PublicClient, WalletClient } from "viem";
import WarpRouteContract from "../abis/WarpRouteContract.json";
import { hyperlaneIdForEclipse } from "../constants";
import { warpRouteContractAddress } from "../constants/contracts";
import { calculateMinimumMint } from "../utils/calculateMinimumMint";
import { getRateInQuote } from "./getRateInQuote";

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
    svmAddress,
  }: {
    depositAsset: `0x${string}`;
    depositAmount: bigint;
    svmAddress: string;
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
    // Calculate Minimum Mint
    ////////////////////////////////
    const rate = await getRateInQuote({ quote: depositAsset }, { publicClient });
    const minimumMint = calculateMinimumMint(depositAmount, rate);

    ////////////////////////////////
    // Deposit
    ////////////////////////////////
    // Simulate the transaction to catch any errors
    const { request: depositRequest } = await publicClient.simulateContract({
      abi: WarpRouteContract.abi as Abi,
      address: warpRouteContractAddress,
      functionName: "depositAndBridge",
      args: [depositAsset, depositAmount, minimumMint, hyperlaneIdForEclipse, svmAddress],
      account: userAddress,
    });

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

    return depositTxHash;
  } catch (error) {
    console.error(error);
  }
}
