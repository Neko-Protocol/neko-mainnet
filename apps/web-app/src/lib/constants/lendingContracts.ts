import {
  LENDING_CONTRACT_ID,
  LENDING_POOL2_CONTRACT_ID,
} from "@/lib/constants/contracts";

type LendingContracts = {
  pool1ContractId: string;
  pool2ContractId: string;
};

export function getLendingContracts(): LendingContracts {
  return {
    pool1ContractId: LENDING_CONTRACT_ID,
    pool2ContractId: LENDING_POOL2_CONTRACT_ID,
  };
}
