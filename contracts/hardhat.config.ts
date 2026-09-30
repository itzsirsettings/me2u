import hardhatIgnitionViemPlugin from "@nomicfoundation/hardhat-ignition-viem";
import hardhatKeystorePlugin from "@nomicfoundation/hardhat-keystore";
import { configVariable, defineConfig } from "hardhat/config";

export default defineConfig({
  plugins: [hardhatKeystorePlugin, hardhatIgnitionViemPlugin],
  solidity: {
    version: "0.8.37",
    path: "./node_modules/solc/soljson.js",
  },
  networks: {
    localSepolia: {
      type: "edr-simulated",
      chainType: "l1",
      chainId: 11_155_111,
    },
    sepolia: {
      type: "http",
      chainType: "l1",
      chainId: 11_155_111,
      url: configVariable("SEPOLIA_RPC_URL"),
      accounts: [configVariable("SEPOLIA_PRIVATE_KEY")],
    },
  },
  test: {
    solidity: {
      isolate: true,
    },
  },
});
