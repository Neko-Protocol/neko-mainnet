# @neko-protocol/reflector

Generated TypeScript bindings for the external **Reflector** SEP-40 oracle Soroban contract, consumed read-only for asset price data across the Neko dApp.

## Regenerating

`src/index.ts` is generated via the Stellar CLI, not hand-written:

```bash
stellar contract bindings ts \
  --rpc-url <network-rpc-url> \
  --network-passphrase "<network passphrase>" \
  --contract-id <deployed-reflector-contract-id> \
  --output-dir ./packages/contracts/reflector
```

**Do not hand-edit `src/index.ts` or anything under `dist/`.** If the Reflector oracle contract's interface drifts, regenerate this package from the deployed contract using the command above, then run `tsc` to rebuild `dist/`.

## Usage

```ts
import { Client as ReflectorClient } from "@neko-protocol/reflector";

const oracle = new ReflectorClient({
  contractId: "...",
  networkPassphrase: "...",
  rpcUrl: "...",
});
```

Reflector contract addresses and network config are read from `apps/web-app/src/lib/constants/contracts.ts`.
