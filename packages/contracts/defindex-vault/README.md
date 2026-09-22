# @neko-protocol/defindex-vault

Generated TypeScript bindings for the external **DeFindex Vault** Soroban contract (SEP-40-adjacent vault interface), consumed read-only and for user-signed deposit/withdraw actions across the Neko dApp.

## Regenerating

`src/index.ts` is generated via the Stellar CLI, not hand-written:

```bash
stellar contract bindings ts \
  --rpc-url <network-rpc-url> \
  --network-passphrase "<network passphrase>" \
  --contract-id <deployed-vault-contract-id> \
  --output-dir ./packages/contracts/defindex-vault
```

**Do not hand-edit `src/index.ts` or anything under `dist/`.** If the DeFindex vault contract's interface drifts (new methods, changed signatures), regenerate this package from the deployed contract using the command above, then run `tsc` to rebuild `dist/`.

## Usage

```ts
import { Client as DefindexVaultClient } from "@neko-protocol/defindex-vault";

const contract = new DefindexVaultClient({
  contractId: "...",
  networkPassphrase: "...",
  rpcUrl: "...",
});
```

See the `vault` skill (`apps/web-app/.claude/skills/vault/SKILL.md`) for how this package is wired through the backend and web-app vault feature.
