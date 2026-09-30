"use client";

import {
  BrowserProvider,
  Interface,
  isAddress,
  JsonRpcProvider,
  parseUnits,
  formatUnits,
  type HDNodeWallet,
  Wallet,
  type Provider,
  type Signer,
} from "ethers";
import {
  ArrowDownLeft,
  ArrowLeft,
  ArrowUpRight,
  Check,
  CircleAlert,
  CircleCheck,
  ExternalLink,
  KeyRound,
  LockKeyhole,
  RefreshCw,
  ShieldCheck,
  Wallet as WalletIcon,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from "react";

import {
  calculateMarketScenario,
  formatCurrencyMinorUnits,
  formatWalletError,
  isSepoliaChainId,
} from "@/lib/me2u-testnet.mjs";

const SEPOLIA_CHAIN_ID = 11_155_111;
const LOCAL_WALLET_STORAGE_KEY = "me2u.sepolia.encrypted-wallet.v1";
const LOCAL_WALLET_STORAGE_EVENT = "me2u:sepolia-wallet-storage";
const TOKEN_ABI = [
  "function balanceOf(address account) view returns (uint256)",
  "function decimals() view returns (uint8)",
  "function hasClaimed(address account) view returns (bool)",
  "function claimTestTokens()",
  "function transfer(address to, uint256 value) returns (bool)",
] as const;
const tokenInterface = new Interface(TOKEN_ABI);

function subscribeToWalletStorage(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(LOCAL_WALLET_STORAGE_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(LOCAL_WALLET_STORAGE_EVENT, onChange);
  };
}

function getWalletStorageSnapshot() {
  try {
    return Boolean(window.localStorage.getItem(LOCAL_WALLET_STORAGE_KEY));
  } catch {
    return false;
  }
}

function getServerWalletStorageSnapshot() {
  return false;
}

function decodeUintResult(data: string) {
  const encodedValue = data.startsWith("0x") ? data.slice(2) : data;
  if (!/^[0-9a-fA-F]{64}$/.test(encodedValue)) {
    throw new Error("The configured token returned an invalid integer response.");
  }
  return BigInt(`0x${encodedValue}`);
}

function decodeBooleanResult(data: string) {
  const value = decodeUintResult(data);
  if (value !== BigInt(0) && value !== BigInt(1)) {
    throw new Error("The configured token returned an invalid boolean response.");
  }
  return value === BigInt(1);
}

type InjectedProvider = {
  request: (args: {
    method: string;
    params?: unknown[] | Record<string, unknown>;
  }) => Promise<unknown>;
  on?: (event: string, listener: (...args: unknown[]) => void) => void;
  removeListener?: (event: string, listener: (...args: unknown[]) => void) => void;
};

declare global {
  interface Window {
    ethereum?: InjectedProvider;
  }
}

type Feedback = { kind: "success" | "error" | "info"; text: string };
type TradeSide = "buy" | "sell";
type MarketCurrency = "USD" | "NGN";
type InAppWallet = Wallet | HDNodeWallet;

const tokenAddress = process.env.NEXT_PUBLIC_ME2U_SEPOLIA_TOKEN_ADDRESS?.trim() ?? "";
const rpcUrl = process.env.NEXT_PUBLIC_ME2U_SEPOLIA_RPC_URL?.trim() ?? "";
const hasTokenAddress = isAddress(tokenAddress);

function shortAddress(value: string) {
  return `${value.slice(0, 6)}…${value.slice(-4)}`;
}

function getErrorCode(error: unknown) {
  if (typeof error === "object" && error !== null && "code" in error) {
    return (error as { code?: unknown }).code;
  }
  return undefined;
}

function parseTokenAmount(value: string, decimals: number) {
  if (!/^(?:0|[1-9]\d*)(?:\.\d+)?$/.test(value.trim())) {
    throw new RangeError("Enter a positive token amount.");
  }
  const amount = parseUnits(value.trim(), decimals);
  if (amount <= BigInt(0)) throw new RangeError("Token amount must be greater than zero.");
  return amount;
}

export default function Me2UTestnetPage() {
  const [provider, setProvider] = useState<Provider | null>(null);
  const [signer, setSigner] = useState<Signer | null>(null);
  const [connectionType, setConnectionType] = useState<"external" | "in-app" | null>(null);
  const [address, setAddress] = useState("");
  const [networkId, setNetworkId] = useState<string | null>(null);
  const [balance, setBalance] = useState<string | null>(null);
  const [hasClaimed, setHasClaimed] = useState<boolean | null>(null);
  const [tokenDecimals, setTokenDecimals] = useState(18);
  const hasEncryptedWallet = useSyncExternalStore(
    subscribeToWalletStorage,
    getWalletStorageSnapshot,
    getServerWalletStorageSnapshot,
  );
  const [working, setWorking] = useState(false);
  const [feedback, setFeedback] = useState<Feedback | null>(null);

  const [pendingWallet, setPendingWallet] = useState<InAppWallet | null>(null);
  const [phraseConfirmed, setPhraseConfirmed] = useState(false);
  const [recoveryPhrase, setRecoveryPhrase] = useState("");
  const [walletPassphrase, setWalletPassphrase] = useState("");
  const [walletPassphraseConfirmation, setWalletPassphraseConfirmation] = useState("");
  const [unlockPassphrase, setUnlockPassphrase] = useState("");
  const [transferAddress, setTransferAddress] = useState("");
  const [transferAmount, setTransferAmount] = useState("");

  const [marketCurrency, setMarketCurrency] = useState<MarketCurrency>("USD");
  const [tradeSide, setTradeSide] = useState<TradeSide>("sell");
  const [scenarioTokenAmount, setScenarioTokenAmount] = useState("");
  const [scenarioRate, setScenarioRate] = useState("");

  const onSepolia = isSepoliaChainId(networkId);
  const hasConnectedSigner = Boolean(provider && signer && address);
  const scenario = useMemo(() => {
    if (!scenarioTokenAmount || !scenarioRate) return null;
    try {
      return calculateMarketScenario({
        tokenAmount: scenarioTokenAmount,
        rate: scenarioRate,
        side: tradeSide,
      });
    } catch {
      return null;
    }
  }, [scenarioRate, scenarioTokenAmount, tradeSide]);

  const refreshWallet = useCallback(
    async (currentProvider = provider, currentAddress = address) => {
      if (!currentProvider) {
        setNetworkId(null);
        setBalance(null);
        setHasClaimed(null);
        return;
      }

      const network = await currentProvider.getNetwork();
      setNetworkId(network.chainId.toString());
      if (!isSepoliaChainId(network.chainId) || !isAddress(tokenAddress) || !currentAddress) {
        setBalance(null);
        setHasClaimed(null);
        return;
      }

      const [balanceData, decimalData, claimedData] = await Promise.all([
        currentProvider.call({
          to: tokenAddress,
          data: tokenInterface.encodeFunctionData("balanceOf", [currentAddress]),
        }),
        currentProvider.call({
          to: tokenAddress,
          data: tokenInterface.encodeFunctionData("decimals", []),
        }),
        currentProvider.call({
          to: tokenAddress,
          data: tokenInterface.encodeFunctionData("hasClaimed", [currentAddress]),
        }),
      ]);
      const rawBalance = decodeUintResult(balanceData);
      const decimalCount = Number(decodeUintResult(decimalData));
      const claimed = decodeBooleanResult(claimedData);
      if (!Number.isInteger(decimalCount) || decimalCount < 0 || decimalCount > 36) {
        throw new Error("The configured test token returned an invalid decimal setting.");
      }
      setTokenDecimals(decimalCount);
      setBalance(formatUnits(rawBalance, decimalCount));
      setHasClaimed(claimed);
    },
    [address, provider],
  );

  const attachInAppWallet = useCallback(
    async (wallet: InAppWallet) => {
      setAddress(wallet.address);
      setConnectionType("in-app");
      setSigner(null);
      setProvider(null);
      setNetworkId(null);
      setBalance(null);
      setHasClaimed(null);

      if (!rpcUrl) {
        setFeedback({
          kind: "info",
          text: "Wallet loaded on this device. Configure the public Sepolia RPC URL to read balances or send test transactions.",
        });
        return;
      }
      try {
        const rpcProvider = new JsonRpcProvider(rpcUrl, {
          name: "sepolia",
          chainId: SEPOLIA_CHAIN_ID,
        });
        const network = await rpcProvider.getNetwork();
        if (!isSepoliaChainId(network.chainId)) {
          rpcProvider.destroy();
          throw new Error("The configured RPC endpoint is not connected to Sepolia.");
        }

        const connectedSigner = wallet.connect(rpcProvider);
        setProvider(rpcProvider);
        setSigner(connectedSigner);
        setNetworkId(network.chainId.toString());
        try {
          await refreshWallet(rpcProvider, wallet.address);
        } catch (error) {
          setFeedback({
            kind: "error",
            text: `Wallet connected, but the token balance could not be loaded: ${formatWalletError(error, "Sepolia RPC request failed.")}`,
          });
          return;
        }
        setFeedback({
          kind: "success",
          text: "The encrypted test wallet is active in this browser.",
        });
      } catch (error) {
        setFeedback({
          kind: "info",
          text: `Wallet decrypted locally, but its Sepolia RPC connection failed: ${formatWalletError(error, "network unavailable.")}`,
        });
      }
    },
    [refreshWallet],
  );

  const connectExternalWallet = async () => {
    setWorking(true);
    setFeedback(null);
    try {
      if (!window.ethereum) {
        throw new Error(
          "No browser wallet was detected. Install a wallet extension or use the in-app option.",
        );
      }
      const browserProvider = new BrowserProvider(window.ethereum, "any");
      const accountResult: unknown = await browserProvider.send("eth_requestAccounts", []);
      if (!Array.isArray(accountResult) || typeof accountResult[0] !== "string") {
        throw new Error("The wallet did not provide an account.");
      }
      const selectedAddress = accountResult[0];
      const connectedSigner = await browserProvider.getSigner(selectedAddress);
      setProvider(browserProvider);
      setSigner(connectedSigner);
      setConnectionType("external");
      setAddress(selectedAddress);
      const network = await browserProvider.getNetwork();
      if (!isSepoliaChainId(network.chainId)) {
        setFeedback({
          kind: "info",
          text: "Wallet connected. Switch to Sepolia before using test tokens.",
        });
      } else {
        try {
          await refreshWallet(browserProvider, selectedAddress);
          setFeedback({
            kind: "success",
            text: "External wallet connected to the testnet page.",
          });
        } catch (error) {
          setFeedback({
            kind: "error",
            text: `Wallet connected, but the token balance could not be loaded: ${formatWalletError(error, "Sepolia RPC request failed.")}`,
          });
        }
      }
    } catch (error) {
      setFeedback({
        kind: "error",
        text: formatWalletError(error, "Could not connect this wallet."),
      });
    } finally {
      setWorking(false);
    }
  };

  const switchExternalWalletToSepolia = async () => {
    setWorking(true);
    setFeedback(null);
    try {
      if (!window.ethereum) throw new Error("No browser wallet was detected.");
      const chainId = `0x${SEPOLIA_CHAIN_ID.toString(16)}`;
      try {
        await window.ethereum.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId }],
        });
      } catch (error) {
        if (getErrorCode(error) !== 4902) throw error;
        if (!rpcUrl) {
          throw new Error(
            "Add Sepolia to your wallet using a trusted RPC endpoint, then reconnect.",
          );
        }
        await window.ethereum.request({
          method: "wallet_addEthereumChain",
          params: [
            {
              chainId,
              chainName: "Sepolia Test Network",
              nativeCurrency: { name: "Sepolia Ether", symbol: "ETH", decimals: 18 },
              rpcUrls: [rpcUrl],
              blockExplorerUrls: ["https://sepolia.etherscan.io"],
            },
          ],
        });
        await window.ethereum.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId }],
        });
      }
      if (provider && address) await refreshWallet(provider, address);
      setFeedback({
        kind: "success",
        text: "Wallet network updated. Refresh the test-token balance before sending.",
      });
    } catch (error) {
      setFeedback({
        kind: "error",
        text: formatWalletError(error, "Could not switch the wallet to Sepolia."),
      });
    } finally {
      setWorking(false);
    }
  };

  const createInAppWallet = () => {
    setFeedback(null);
    try {
      const wallet = Wallet.createRandom();
      if (!wallet.mnemonic?.phrase)
        throw new Error("Wallet recovery phrase could not be created.");
      setPendingWallet(wallet);
      setRecoveryPhrase(wallet.mnemonic.phrase);
      setPhraseConfirmed(false);
      setWalletPassphrase("");
      setWalletPassphraseConfirmation("");
      setFeedback({
        kind: "info",
        text: "Write down the recovery phrase and store it somewhere private before saving this wallet.",
      });
    } catch (error) {
      setFeedback({
        kind: "error",
        text: formatWalletError(error, "Could not create a test wallet in this browser."),
      });
    }
  };

  const saveInAppWallet = async () => {
    setWorking(true);
    setFeedback(null);
    try {
      const wallet = pendingWallet ?? Wallet.fromPhrase(recoveryPhrase.trim());
      const isGeneratedWallet = Boolean(pendingWallet);
      if (isGeneratedWallet && !phraseConfirmed) {
        throw new Error("Confirm that you have saved the new recovery phrase first.");
      }
      if (walletPassphrase.length < 12) {
        throw new Error("Use a wallet passphrase with at least 12 characters.");
      }
      if (walletPassphrase !== walletPassphraseConfirmation) {
        throw new Error("The wallet passphrases do not match.");
      }

      const encrypted = await wallet.encrypt(walletPassphrase);
      window.localStorage.setItem(LOCAL_WALLET_STORAGE_KEY, encrypted);
      window.dispatchEvent(new Event(LOCAL_WALLET_STORAGE_EVENT));
      setPendingWallet(null);
      setRecoveryPhrase("");
      setPhraseConfirmed(false);
      setWalletPassphrase("");
      setWalletPassphraseConfirmation("");
      await attachInAppWallet(wallet);
    } catch (error) {
      setFeedback({
        kind: "error",
        text: formatWalletError(error, "Could not encrypt and save this test wallet."),
      });
    } finally {
      setWorking(false);
    }
  };

  const unlockInAppWallet = async () => {
    setWorking(true);
    setFeedback(null);
    try {
      const encrypted = window.localStorage.getItem(LOCAL_WALLET_STORAGE_KEY);
      if (!encrypted) throw new Error("No encrypted in-app wallet was found on this device.");
      if (!unlockPassphrase) throw new Error("Enter the wallet passphrase to unlock it.");
      const wallet = await Wallet.fromEncryptedJson(encrypted, unlockPassphrase);
      setUnlockPassphrase("");
      await attachInAppWallet(wallet);
    } catch (error) {
      setFeedback({
        kind: "error",
        text: formatWalletError(error, "Could not unlock this in-app wallet."),
      });
    } finally {
      setWorking(false);
    }
  };

  const disconnectWallet = () => {
    setProvider(null);
    setSigner(null);
    setConnectionType(null);
    setAddress("");
    setNetworkId(null);
    setBalance(null);
    setHasClaimed(null);
    setFeedback({ kind: "info", text: "Wallet disconnected from this page." });
  };

  const requireSepoliaSigner = async (): Promise<Signer> => {
    if (!provider || !signer || !address) {
      throw new Error("Connect a wallet before using test tokens.");
    }
    const network = await provider.getNetwork();
    setNetworkId(network.chainId.toString());
    if (!isSepoliaChainId(network.chainId)) {
      throw new Error(
        "This wallet is on the wrong network. Switch to Sepolia before continuing.",
      );
    }
    if (!hasTokenAddress) {
      throw new Error("The Sepolia test-token contract is not configured yet.");
    }
    return signer;
  };

  const claimTestTokens = async () => {
    setWorking(true);
    setFeedback(null);
    try {
      const connectedSigner = await requireSepoliaSigner();
      const transaction = await connectedSigner.sendTransaction({
        to: tokenAddress,
        data: tokenInterface.encodeFunctionData("claimTestTokens", []),
      });
      await transaction.wait();
      await refreshWallet();
      setFeedback({
        kind: "success",
        text: "Test tokens were claimed on Sepolia. They have no monetary value.",
      });
    } catch (error) {
      setFeedback({
        kind: "error",
        text: formatWalletError(
          error,
          "The test-token claim failed. Check your network and test ETH, then try again.",
        ),
      });
    } finally {
      setWorking(false);
    }
  };

  const sendTestTokens = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setWorking(true);
    setFeedback(null);
    try {
      if (!isAddress(transferAddress.trim()))
        throw new Error("Enter a valid Ethereum recipient address.");
      const amount = parseTokenAmount(transferAmount, tokenDecimals);
      const connectedSigner = await requireSepoliaSigner();
      const transaction = await connectedSigner.sendTransaction({
        to: tokenAddress,
        data: tokenInterface.encodeFunctionData("transfer", [transferAddress.trim(), amount]),
      });
      await transaction.wait();
      setTransferAddress("");
      setTransferAmount("");
      await refreshWallet();
      setFeedback({
        kind: "success",
        text: "Test-token transfer confirmed on Sepolia. No real money moved.",
      });
    } catch (error) {
      setFeedback({
        kind: "error",
        text: formatWalletError(
          error,
          "The test-token transfer failed. Check the network and your Sepolia ETH, then retry.",
        ),
      });
    } finally {
      setWorking(false);
    }
  };

  useEffect(() => {
    if (
      connectionType !== "external" ||
      !window.ethereum?.on ||
      !window.ethereum.removeListener
    )
      return;
    const updateChain = (chainId: unknown) => {
      setNetworkId(String(chainId));
      setBalance(null);
      setHasClaimed(null);
      if (provider && address) {
        void refreshWallet(provider, address).catch((error: unknown) => {
          setFeedback({
            kind: "error",
            text: formatWalletError(error, "Could not refresh the selected network."),
          });
        });
      }
    };
    const updateAccounts = (accounts: unknown) => {
      if (!Array.isArray(accounts) || typeof accounts[0] !== "string") {
        setProvider(null);
        setSigner(null);
        setConnectionType(null);
        setAddress("");
        setNetworkId(null);
        setBalance(null);
        setHasClaimed(null);
        return;
      }
      const selectedAddress = accounts[0];
      setAddress(selectedAddress);
      if (provider instanceof BrowserProvider) {
        void provider
          .getSigner(selectedAddress)
          .then((selectedSigner) => {
            setSigner(selectedSigner);
          })
          .catch((error: unknown) => {
            setFeedback({
              kind: "error",
              text: formatWalletError(error, "Could not select the active wallet account."),
            });
          });
      }
      if (provider) {
        void refreshWallet(provider, selectedAddress).catch((error: unknown) => {
          setFeedback({
            kind: "error",
            text: formatWalletError(error, "Could not refresh the selected account."),
          });
        });
      }
    };
    window.ethereum.on("chainChanged", updateChain);
    window.ethereum.on("accountsChanged", updateAccounts);
    return () => {
      window.ethereum?.removeListener?.("chainChanged", updateChain);
      window.ethereum?.removeListener?.("accountsChanged", updateAccounts);
    };
  }, [address, connectionType, provider, refreshWallet]);

  return (
    <main className="mx-auto min-h-screen max-w-6xl px-4 pb-32 pt-24 text-[var(--color-text-primary)] sm:px-6 md:pt-28">
      <div className="mb-6">
        <Link
          href="/wallet"
          className="inline-flex min-h-11 items-center gap-2 rounded-lg px-3 text-sm font-bold text-[var(--color-text-secondary)] transition hover:bg-[var(--color-bg-secondary)] hover:text-[var(--color-text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent-primary)]"
        >
          <ArrowLeft size={17} aria-hidden="true" />
          NGN wallet
        </Link>
      </div>

      <header className="mb-7 max-w-3xl">
        <p className="mb-2 text-xs font-black uppercase tracking-[0.18em] text-[var(--color-accent-primary)]">
          Sepolia · global test network
        </p>
        <h1 className="text-3xl font-black tracking-tight sm:text-4xl">Me2U testnet wallet</h1>
        <p className="mt-3 text-sm leading-6 text-[var(--color-text-secondary)] sm:text-base">
          Try self-custody, test-token transfers and USD/NGN market scenarios. This wallet is
          separate from your Me2U NGN wallet.
        </p>
      </header>

      <section
        aria-label="Testnet warning"
        className="mb-6 flex gap-3 rounded-xl border border-amber-500/40 bg-amber-500/10 p-4"
      >
        <CircleAlert
          className="mt-0.5 shrink-0 text-amber-700 dark:text-amber-300"
          size={20}
          aria-hidden="true"
        />
        <div>
          <h2 className="font-extrabold text-amber-900 dark:text-amber-200">
            Test tokens have no monetary value
          </h2>
          <p className="mt-1 text-sm leading-5 text-amber-900/90 dark:text-amber-100/90">
            There is no live USD or NGN exchange, withdrawal, redemption, dollar peg or promised
            appreciation. The scenario panel uses rates you enter and never places an order.
          </p>
        </div>
      </section>

      {feedback && (
        <div
          role={feedback.kind === "error" ? "alert" : "status"}
          aria-live={feedback.kind === "error" ? "assertive" : "polite"}
          className={`mb-6 flex gap-2 rounded-lg border p-3 text-sm ${
            feedback.kind === "error"
              ? "border-red-500/40 bg-red-500/10 text-red-800 dark:text-red-200"
              : feedback.kind === "success"
                ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-800 dark:text-emerald-200"
                : "border-blue-500/40 bg-blue-500/10 text-blue-800 dark:text-blue-200"
          }`}
        >
          {feedback.kind === "success" ? <CircleCheck size={18} aria-hidden="true" /> : null}
          <p>{feedback.text}</p>
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,0.8fr)]">
        <section className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] p-5 shadow-[4px_4px_0px_var(--color-shadow)] sm:p-6">
          <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="grid h-11 w-11 place-items-center rounded-full bg-[var(--color-bg-secondary)] text-[var(--color-accent-primary)]">
                <WalletIcon size={22} aria-hidden="true" />
              </span>
              <div>
                <h2 className="text-xl font-black">Network & wallet</h2>
                <p className="text-sm text-[var(--color-text-secondary)]">
                  Ethereum Sepolia · chain 11155111
                </p>
              </div>
            </div>
            <span className="rounded-full border border-amber-500/40 bg-amber-500/10 px-3 py-1 text-xs font-black uppercase tracking-wide text-amber-800 dark:text-amber-200">
              Testnet only
            </span>
          </div>

          <div className="mb-5 rounded-lg bg-[var(--color-bg-secondary)] p-4 text-sm">
            <div className="flex items-center justify-between gap-3">
              <span className="text-[var(--color-text-secondary)]">Connection</span>
              <span className="font-bold">
                {!hasConnectedSigner
                  ? connectionType === "in-app" && address
                    ? "In-app wallet loaded · RPC unavailable"
                    : "Not connected"
                  : connectionType === "external"
                    ? "External wallet"
                    : "In-app self-custody"}
              </span>
            </div>
            <div className="mt-2 flex items-center justify-between gap-3">
              <span className="text-[var(--color-text-secondary)]">Current chain</span>
              <span
                className={`font-bold ${onSepolia ? "text-emerald-700 dark:text-emerald-300" : "text-amber-800 dark:text-amber-200"}`}
              >
                {networkId
                  ? onSepolia
                    ? "Sepolia testnet"
                    : `Wrong network · ${networkId}`
                  : "Not detected"}
              </span>
            </div>
            {address && (
              <div className="mt-2 flex items-center justify-between gap-3">
                <span className="text-[var(--color-text-secondary)]">Wallet address</span>
                <a
                  href={`https://sepolia.etherscan.io/address/${address}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex min-h-11 items-center gap-1 font-mono text-xs font-bold underline decoration-dotted underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent-primary)]"
                  title={address}
                >
                  {shortAddress(address)} <ExternalLink size={13} aria-hidden="true" />
                </a>
              </div>
            )}
            <div className="mt-2 flex items-center justify-between gap-3">
              <span className="text-[var(--color-text-secondary)]">Token contract</span>
              {hasTokenAddress ? (
                <a
                  href={`https://sepolia.etherscan.io/address/${tokenAddress}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex min-h-11 items-center gap-1 font-mono text-xs font-bold underline decoration-dotted underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent-primary)]"
                >
                  {shortAddress(tokenAddress)} <ExternalLink size={13} aria-hidden="true" />
                </a>
              ) : (
                <span className="font-bold text-amber-800 dark:text-amber-200">
                  Not configured
                </span>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              onClick={() => void connectExternalWallet()}
              disabled={working}
              className="min-h-11 flex-1 rounded-lg bg-[var(--color-accent-primary)] px-4 py-2 font-extrabold text-white transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent-primary)] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Connect browser wallet
            </button>
            {connectionType === "external" && (
              <button
                type="button"
                onClick={() => void switchExternalWalletToSepolia()}
                disabled={working || onSepolia}
                className="min-h-11 rounded-lg border border-[var(--color-border)] px-4 py-2 font-bold transition hover:bg-[var(--color-bg-secondary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent-primary)] disabled:cursor-not-allowed disabled:opacity-50"
              >
                Switch to Sepolia
              </button>
            )}
            {hasConnectedSigner && (
              <button
                type="button"
                onClick={() =>
                  void refreshWallet().catch((error: unknown) =>
                    setFeedback({
                      kind: "error",
                      text: formatWalletError(error, "Could not refresh the wallet."),
                    }),
                  )
                }
                disabled={working}
                aria-label="Refresh wallet balance"
                className="grid min-h-11 min-w-11 place-items-center rounded-lg border border-[var(--color-border)] transition hover:bg-[var(--color-bg-secondary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent-primary)] disabled:opacity-50"
              >
                <RefreshCw size={17} aria-hidden="true" />
              </button>
            )}
          </div>

          {hasConnectedSigner && (
            <button
              type="button"
              onClick={disconnectWallet}
              className="mt-2 min-h-11 px-2 text-sm font-bold text-[var(--color-text-secondary)] underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent-primary)]"
            >
              Disconnect from this page
            </button>
          )}
        </section>

        <section className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] p-5 shadow-[4px_4px_0px_var(--color-shadow)] sm:p-6">
          <div className="mb-4 flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-full bg-[var(--color-bg-secondary)] text-[var(--color-accent-primary)]">
              <KeyRound size={21} aria-hidden="true" />
            </span>
            <div>
              <h2 className="text-xl font-black">In-app self-custody</h2>
              <p className="text-sm text-[var(--color-text-secondary)]">
                Keys stay in this browser
              </p>
            </div>
          </div>

          <div className="mb-4 flex gap-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-3 text-xs leading-5 text-[var(--color-text-secondary)]">
            <LockKeyhole className="mt-0.5 shrink-0" size={16} aria-hidden="true" />
            <p>
              The app stores only an encrypted keystore in local browser storage. Me2U servers
              never receive your phrase, private key or passphrase. This test wallet has not had
              a production security review; do not store valuable funds here.
            </p>
          </div>

          {!pendingWallet && !address && (
            <button
              type="button"
              onClick={createInAppWallet}
              disabled={working}
              className="min-h-11 w-full rounded-lg border border-[var(--color-border)] px-4 py-2 font-extrabold transition hover:bg-[var(--color-bg-secondary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent-primary)] disabled:opacity-50"
            >
              Create an in-app test wallet
            </button>
          )}

          {hasEncryptedWallet && !address && (
            <form
              className="mt-4 space-y-3 border-t border-[var(--color-border)] pt-4"
              onSubmit={(event) => {
                event.preventDefault();
                void unlockInAppWallet();
              }}
            >
              <h3 className="font-bold">Unlock wallet saved on this device</h3>
              <label
                className="block text-sm font-semibold"
                htmlFor="me2u-wallet-unlock-passphrase"
              >
                Wallet passphrase
              </label>
              <input
                id="me2u-wallet-unlock-passphrase"
                type="password"
                autoComplete="current-password"
                value={unlockPassphrase}
                onChange={(event) => setUnlockPassphrase(event.target.value)}
                className="min-h-11 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-card)] px-3 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent-primary)]"
              />
              <button
                type="submit"
                disabled={working}
                className="btn-secondary min-h-11 w-full disabled:opacity-50"
              >
                {working ? "Unlocking locally…" : "Unlock in this browser"}
              </button>
            </form>
          )}

          {!pendingWallet && !address && (
            <details className="mt-4 border-t border-[var(--color-border)] pt-4">
              <summary className="min-h-11 cursor-pointer py-2 font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent-primary)]">
                Recover a wallet with a phrase
              </summary>
              <form
                className="space-y-3 pt-2"
                onSubmit={(event) => {
                  event.preventDefault();
                  void saveInAppWallet();
                }}
              >
                <label
                  className="block text-sm font-semibold"
                  htmlFor="me2u-wallet-recovery-phrase"
                >
                  Recovery phrase
                </label>
                <textarea
                  id="me2u-wallet-recovery-phrase"
                  rows={3}
                  autoComplete="off"
                  spellCheck={false}
                  value={recoveryPhrase}
                  onChange={(event) => setRecoveryPhrase(event.target.value)}
                  className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-card)] p-3 font-mono text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent-primary)]"
                />
                <WalletEncryptionFields
                  passphrase={walletPassphrase}
                  confirmation={walletPassphraseConfirmation}
                  onPassphraseChange={setWalletPassphrase}
                  onConfirmationChange={setWalletPassphraseConfirmation}
                />
                <button
                  type="submit"
                  disabled={working || !recoveryPhrase.trim()}
                  className="btn-secondary min-h-11 w-full disabled:opacity-50"
                >
                  {working ? "Encrypting locally…" : "Recover and encrypt wallet"}
                </button>
              </form>
            </details>
          )}

          {pendingWallet && (
            <div className="space-y-4 border-t border-[var(--color-border)] pt-4">
              <div>
                <p className="font-bold">Save this recovery phrase</p>
                <p className="mt-1 text-xs leading-5 text-[var(--color-text-secondary)]">
                  Anyone with this phrase can control the wallet. Me2U cannot recover it. Write
                  it down and keep it private.
                </p>
                <div
                  className="mt-3 select-all break-words rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-3 font-mono text-sm leading-6"
                  aria-label="New wallet recovery phrase"
                >
                  {recoveryPhrase}
                </div>
              </div>
              <label className="flex min-h-11 items-start gap-2 text-sm leading-5">
                <input
                  type="checkbox"
                  checked={phraseConfirmed}
                  onChange={(event) => setPhraseConfirmed(event.target.checked)}
                  className="mt-1 h-4 w-4 accent-[var(--color-accent-primary)]"
                />
                <span>
                  I saved this recovery phrase somewhere private. It will not be shown again.
                </span>
              </label>
              <WalletEncryptionFields
                passphrase={walletPassphrase}
                confirmation={walletPassphraseConfirmation}
                onPassphraseChange={setWalletPassphrase}
                onConfirmationChange={setWalletPassphraseConfirmation}
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setPendingWallet(null);
                    setRecoveryPhrase("");
                    setPhraseConfirmed(false);
                  }}
                  className="min-h-11 flex-1 rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent-primary)]"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => void saveInAppWallet()}
                  disabled={
                    working ||
                    !phraseConfirmed ||
                    walletPassphrase.length < 12 ||
                    walletPassphrase !== walletPassphraseConfirmation
                  }
                  className="min-h-11 flex-[2] rounded-lg bg-[var(--color-accent-primary)] px-3 py-2 text-sm font-extrabold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent-primary)] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {working ? "Encrypting locally…" : "Encrypt and save wallet"}
                </button>
              </div>
            </div>
          )}

          {connectionType === "in-app" && address && (
            <p className="mt-4 flex items-center gap-2 border-t border-[var(--color-border)] pt-4 text-sm font-bold text-emerald-700 dark:text-emerald-300">
              <Check size={17} aria-hidden="true" /> Wallet is active in this tab.
            </p>
          )}
        </section>
      </div>

      <section className="mt-5 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] p-5 shadow-[4px_4px_0px_var(--color-shadow)] sm:p-6">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-black">Test token balance</h2>
            <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
              Sepolia test tokens only · separate from NGN ledger
            </p>
          </div>
          <span className="rounded-full border border-amber-500/40 bg-amber-500/10 px-3 py-1 text-xs font-black uppercase text-amber-800 dark:text-amber-200">
            No cash value
          </span>
        </div>

        {address ? (
          <div className="mb-4 rounded-lg bg-[var(--color-bg-secondary)] p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-[var(--color-text-secondary)]">
              ME2UT test token balance
            </p>
            <p className="mt-1 break-all font-mono text-2xl font-black">
              {balance ?? "—"} <span className="text-base">ME2UT</span>
            </p>
            {balance === null && !onSepolia && (
              <p className="mt-1 text-sm text-amber-800 dark:text-amber-200">
                Switch the connected wallet to Sepolia to read this balance.
              </p>
            )}
          </div>
        ) : (
          <p className="mb-4 rounded-lg bg-[var(--color-bg-secondary)] p-4 text-sm text-[var(--color-text-secondary)]">
            Connect an external wallet or create/unlock the in-app wallet to view its testnet
            balance.
          </p>
        )}

        {!hasTokenAddress && (
          <p className="mb-4 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm leading-5 text-amber-900 dark:text-amber-100">
            The test-token contract has not been deployed/configured. Once the Sepolia
            deployment is reviewed and its address is added to the public app configuration,
            claims and transfers will be enabled.
          </p>
        )}

        {hasConnectedSigner && onSepolia && hasTokenAddress && (
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-lg border border-[var(--color-border)] p-4">
              <h3 className="font-extrabold">Test faucet</h3>
              <p className="my-2 text-sm leading-5 text-[var(--color-text-secondary)]">
                Claim 1,000 valueless test tokens once per address. This faucet is not mining or
                a real reward program.
              </p>
              <button
                type="button"
                onClick={() => void claimTestTokens()}
                disabled={working || hasClaimed === true || hasClaimed === null}
                className="min-h-11 w-full rounded-lg border border-[var(--color-border)] px-4 py-2 font-bold transition hover:bg-[var(--color-bg-secondary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent-primary)] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {hasClaimed
                  ? "Already claimed for this address"
                  : working
                    ? "Submitting claim…"
                    : "Claim test tokens"}
              </button>
            </div>
            <form
              className="space-y-3 rounded-lg border border-[var(--color-border)] p-4"
              onSubmit={(event) => void sendTestTokens(event)}
            >
              <h3 className="font-extrabold">Send a test transfer</h3>
              <div>
                <label
                  htmlFor="me2u-test-recipient"
                  className="mb-1 block text-sm font-semibold"
                >
                  Recipient address
                </label>
                <input
                  id="me2u-test-recipient"
                  autoComplete="off"
                  spellCheck={false}
                  value={transferAddress}
                  onChange={(event) => setTransferAddress(event.target.value)}
                  placeholder="0x…"
                  className="min-h-11 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-card)] px-3 font-mono text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent-primary)]"
                />
              </div>
              <div>
                <label htmlFor="me2u-test-amount" className="mb-1 block text-sm font-semibold">
                  ME2UT amount
                </label>
                <input
                  id="me2u-test-amount"
                  inputMode="decimal"
                  value={transferAmount}
                  onChange={(event) => setTransferAmount(event.target.value)}
                  placeholder="0.00"
                  className="min-h-11 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-card)] px-3 font-mono text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent-primary)]"
                />
              </div>
              <button
                type="submit"
                disabled={working || !transferAddress || !transferAmount}
                className="min-h-11 w-full rounded-lg bg-[var(--color-accent-primary)] px-4 py-2 font-extrabold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent-primary)] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {working ? "Waiting for Sepolia…" : "Send test tokens"}
              </button>
              <p className="text-xs leading-5 text-[var(--color-text-secondary)]">
                Transactions need Sepolia ETH for network gas. Never use real ETH or a mainnet
                wallet for this prototype.
              </p>
            </form>
          </div>
        )}

        {address && hasTokenAddress && (
          <p className="mt-4 text-sm text-[var(--color-text-secondary)]">
            <a
              href={`https://sepolia.etherscan.io/token/${tokenAddress}?a=${address}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex min-h-11 items-center gap-2 font-bold underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent-primary)]"
            >
              View token activity on Sepolia Etherscan{" "}
              <ExternalLink size={15} aria-hidden="true" />
            </a>
          </p>
        )}
      </section>

      <section className="mt-5 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] p-5 shadow-[4px_4px_0px_var(--color-shadow)] sm:p-6">
        <div className="mb-4 flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-full bg-[var(--color-bg-secondary)] text-[var(--color-accent-primary)]">
            {tradeSide === "sell" ? (
              <ArrowDownLeft size={21} aria-hidden="true" />
            ) : (
              <ArrowUpRight size={21} aria-hidden="true" />
            )}
          </span>
          <div>
            <h2 className="text-xl font-black">USD / NGN market scenario</h2>
            <p className="text-sm text-[var(--color-text-secondary)]">
              A calculator only; it does not trade, quote or settle funds.
            </p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-3">
            <div>
              <label htmlFor="me2u-market-pair" className="mb-1 block text-sm font-semibold">
                Scenario pair
              </label>
              <select
                id="me2u-market-pair"
                value={marketCurrency}
                onChange={(event) => setMarketCurrency(event.target.value as MarketCurrency)}
                className="min-h-11 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-card)] px-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent-primary)]"
              >
                <option value="USD">ME2UT / USD (scenario)</option>
                <option value="NGN">ME2UT / NGN (scenario)</option>
              </select>
            </div>
            <div>
              <label htmlFor="me2u-market-side" className="mb-1 block text-sm font-semibold">
                Action being modelled
              </label>
              <select
                id="me2u-market-side"
                value={tradeSide}
                onChange={(event) => setTradeSide(event.target.value as TradeSide)}
                className="min-h-11 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-card)] px-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent-primary)]"
              >
                <option value="sell">Sell ME2UT</option>
                <option value="buy">Buy ME2UT</option>
              </select>
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <label
                htmlFor="me2u-market-token-amount"
                className="mb-1 block text-sm font-semibold"
              >
                Test token amount
              </label>
              <input
                id="me2u-market-token-amount"
                inputMode="decimal"
                value={scenarioTokenAmount}
                onChange={(event) => setScenarioTokenAmount(event.target.value)}
                placeholder="Enter amount"
                className="min-h-11 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-card)] px-3 font-mono focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent-primary)]"
              />
            </div>
            <div>
              <label htmlFor="me2u-market-rate" className="mb-1 block text-sm font-semibold">
                Your illustrative {marketCurrency} rate per ME2UT
              </label>
              <input
                id="me2u-market-rate"
                inputMode="decimal"
                value={scenarioRate}
                onChange={(event) => setScenarioRate(event.target.value)}
                placeholder="Enter a scenario rate"
                className="min-h-11 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-card)] px-3 font-mono focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent-primary)]"
              />
            </div>
          </div>
        </div>

        {scenario ? (
          <div
            className="mt-4 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-4"
            aria-live="polite"
          >
            <p className="text-xs font-bold uppercase tracking-wide text-[var(--color-text-secondary)]">
              Illustrative amount only
            </p>
            <p className="mt-1 text-2xl font-black">
              {marketCurrency === "USD" ? "$" : "₦"}
              {formatCurrencyMinorUnits(scenario.currencyMinorUnits)}
            </p>
            <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
              {tradeSide === "sell" ? "Scenario proceeds if sold" : "Scenario cost to buy"} · no
              quote, order or money movement
            </p>
          </div>
        ) : (
          <p className="mt-4 rounded-lg bg-[var(--color-bg-secondary)] p-4 text-sm text-[var(--color-text-secondary)]">
            Enter a positive token amount and rate (up to 8 decimal places) to see a non-binding
            calculation.
          </p>
        )}

        <div className="mt-4 flex gap-2 rounded-lg border border-[var(--color-border)] p-3 text-xs leading-5 text-[var(--color-text-secondary)]">
          <ShieldCheck
            className="mt-0.5 shrink-0 text-[var(--color-accent-primary)]"
            size={17}
            aria-hidden="true"
          />
          <p>
            Any later live USD or NGN exchange/redemption needs a confirmed market venue,
            available liquidity, full reserve backing for redemption obligations, a published
            market quote and country-by-country legal/provider clearance. No live conversion is
            enabled here.
          </p>
        </div>
      </section>

      <section className="mt-5 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] p-5 sm:p-6">
        <h2 className="text-lg font-black">Network resources</h2>
        <p className="mt-2 text-sm leading-6 text-[var(--color-text-secondary)]">
          The in-app wallet needs Sepolia test ETH for gas. Use only a trusted testnet faucet
          and never send funds to a faucet.
        </p>
        <a
          href="https://ethereum.org/developers/docs/networks/#sepolia"
          target="_blank"
          rel="noreferrer"
          className="mt-2 inline-flex min-h-11 items-center gap-2 font-bold underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent-primary)]"
        >
          Sepolia network information <ExternalLink size={15} aria-hidden="true" />
        </a>
      </section>
    </main>
  );
}

function WalletEncryptionFields({
  passphrase,
  confirmation,
  onPassphraseChange,
  onConfirmationChange,
}: {
  passphrase: string;
  confirmation: string;
  onPassphraseChange: (value: string) => void;
  onConfirmationChange: (value: string) => void;
}) {
  return (
    <div className="space-y-3">
      <div>
        <label
          className="mb-1 block text-sm font-semibold"
          htmlFor="me2u-wallet-new-passphrase"
        >
          Wallet encryption passphrase
        </label>
        <input
          id="me2u-wallet-new-passphrase"
          type="password"
          autoComplete="new-password"
          minLength={12}
          value={passphrase}
          onChange={(event) => onPassphraseChange(event.target.value)}
          className="min-h-11 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-card)] px-3 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent-primary)]"
        />
      </div>
      <div>
        <label
          className="mb-1 block text-sm font-semibold"
          htmlFor="me2u-wallet-confirm-passphrase"
        >
          Confirm passphrase
        </label>
        <input
          id="me2u-wallet-confirm-passphrase"
          type="password"
          autoComplete="new-password"
          minLength={12}
          value={confirmation}
          onChange={(event) => onConfirmationChange(event.target.value)}
          className="min-h-11 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-card)] px-3 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent-primary)]"
        />
      </div>
      <p className="text-xs leading-5 text-[var(--color-text-secondary)]">
        Use at least 12 characters. This passphrase encrypts the local keystore and is never
        sent to Me2U.
      </p>
    </div>
  );
}
