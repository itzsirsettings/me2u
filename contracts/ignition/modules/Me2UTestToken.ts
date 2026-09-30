import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

export default buildModule("Me2UTestTokenModule", (m) => {
  const token = m.contract("Me2UTestToken");
  return { token };
});
