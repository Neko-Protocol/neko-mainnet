import { Buffer } from "buffer";
import {
  Client as ContractClient,
  Spec as ContractSpec,
  ClientOptions as ContractClientOptions,
  MethodOptions,
  AssembledTransaction,
} from "@stellar/stellar-sdk/contract";
import type { u32, u64, Option } from "@stellar/stellar-sdk/contract";
export * from "@stellar/stellar-sdk";
export * as contract from "@stellar/stellar-sdk/contract";
export * as rpc from "@stellar/stellar-sdk/rpc";

if (typeof window !== "undefined") {
  //@ts-ignore Buffer exists
  window.Buffer = window.Buffer || Buffer;
}

/**
 * Reflector oracle contract IDs on Stellar networks.
 */
export const networks = {
  pubnet: {
    networkPassphrase: "Public Global Stellar Network ; September 2015",
    contractId: "CALI2BYU2JE6WVRUFYTS6MSBNEHGJ35P4AVCZYF3B6QOE3QKOB2PLE6M",
  },
} as const;

/**
 * Quoted asset definition (SEP-40 compatible).
 * - Stellar: a classic or Soroban asset contract address
 * - Other: any external token/asset identified by symbol
 */
export type Asset =
  | { tag: "Stellar"; values: readonly [string] }
  | { tag: "Other"; values: readonly [string] };

/**
 * Price record definition (SEP-40 compatible).
 */
export interface PriceData {
  price: bigint;
  timestamp: u64;
}

/**
 * Standard SEP-40 oracle interface exposed by the Reflector oracle contract.
 */
export interface Client {
  base: (options?: MethodOptions) => Promise<AssembledTransaction<Asset>>;
  price: (
    { asset, timestamp }: { asset: Asset; timestamp: u64 },
    options?: MethodOptions
  ) => Promise<AssembledTransaction<Option<PriceData>>>;
  assets: (
    options?: MethodOptions
  ) => Promise<AssembledTransaction<Array<Asset>>>;
  prices: (
    { asset, records }: { asset: Asset; records: u32 },
    options?: MethodOptions
  ) => Promise<AssembledTransaction<Option<Array<PriceData>>>>;
  decimals: (options?: MethodOptions) => Promise<AssembledTransaction<u32>>;
  lastprice: (
    { asset }: { asset: Asset },
    options?: MethodOptions
  ) => Promise<AssembledTransaction<Option<PriceData>>>;
  resolution: (options?: MethodOptions) => Promise<AssembledTransaction<u32>>;
}

export class Client extends ContractClient {
  readonly options: ContractClientOptions;

  constructor(options: ContractClientOptions) {
    super(
      new ContractSpec([
        // Asset enum (SEP-40)
        "AAAAAgAAACtRdW90ZWQgYXNzZXQgZGVmaW5pdGlvbiAoU0VQLTQwIGNvbXBhdGlibGUpAAAAAAAAAAAFQXNzZXQAAAAAAAACAAAAAQAAAClDYW4gYmUgYSBTdGVsbGFyIENsYXNzaWMgb3IgU29yb2JhbiBhc3NldAAAAAAAAAdTdGVsbGFyAAAAAAEAAAATAAAAAQAAACZGb3IgYW55IGV4dGVybmFsIHRva2Vucy9hc3NldHMvc3ltYm9scwAAAAAABU90aGVyAAAAAAAAAQAAABE=",
        // PriceData struct (SEP-40)
        "AAAAAQAAACtQcmljZSByZWNvcmQgZGVmaW5pdGlvbiAoU0VQLTQwIGNvbXBhdGlibGUpAAAAAAAAAAAJUHJpY2VEYXRhAAAAAAAAAgAAAAAAAAAFcHJpY2UAAAAAAAALAAAAAAAAAAl0aW1lc3RhbXAAAAAAAAAG",
        // base()
        "AAAAAAAAAAAAAAAEYmFzZQAAAAAAAAABAAAH0AAAAAVBc3NldAAAAA==",
        // price(asset, timestamp)
        "AAAAAAAAAAAAAAAFcHJpY2UAAAAAAAACAAAAAAAAAAVhc3NldAAAAAAAB9AAAAAFQXNzZXQAAAAAAAAAAAAACXRpbWVzdGFtcAAAAAAAAAYAAAABAAAD6AAAB9AAAAAJUHJpY2VEYXRhAAAA",
        // assets()
        "AAAAAAAAAAAAAAAGYXNzZXRzAAAAAAAAAAAAAQAAA+oAAAfQAAAABUFzc2V0AAAA",
        // prices(asset, records)
        "AAAAAAAAAAAAAAAGcHJpY2VzAAAAAAACAAAAAAAAAAVhc3NldAAAAAAAB9AAAAAFQXNzZXQAAAAAAAAAAAAAB3JlY29yZHMAAAAABAAAAAEAAAPoAAAD6gAAB9AAAAAJUHJpY2VEYXRhAAAA",
        // decimals()
        "AAAAAAAAAAAAAAAIZGVjaW1hbHMAAAAAAAAAAQAAAAQ=",
        // lastprice(asset)
        "AAAAAAAAAAAAAAAJbGFzdHByaWNlAAAAAAAAAQAAAAAAAAAFYXNzZXQAAAAAAAfQAAAABUFzc2V0AAAAAAAAAQAAA+gAAAfQAAAACVByaWNlRGF0YQAAAA==",
        // resolution()
        "AAAAAAAAAAAAAAAKcmVzb2x1dGlvbgAAAAAAAAAAAAEAAAAE",
      ]),
      options
    );
    this.options = options;
  }

  readonly fromJSON = {
    base: this.txFromJSON<Asset>,
    price: this.txFromJSON<Option<PriceData>>,
    assets: this.txFromJSON<Array<Asset>>,
    prices: this.txFromJSON<Option<Array<PriceData>>>,
    decimals: this.txFromJSON<number>,
    lastprice: this.txFromJSON<Option<PriceData>>,
    resolution: this.txFromJSON<number>,
  };
}
