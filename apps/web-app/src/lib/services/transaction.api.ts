import type {
  PrepareTransactionRequest,
  PrepareTransactionResponse,
  SubmitTransactionRequest,
  TransactionStatusResponse,
} from "@neko/api-contracts";
import { backendClient } from "./backend-client";

export type {
  PrepareTransactionRequest,
  PrepareTransactionResponse,
  SubmitTransactionRequest,
  TransactionStatus,
  TransactionStatusResponse,
} from "@neko/api-contracts";

export const txApi = {
  prepare: (req: PrepareTransactionRequest) =>
    backendClient.post<PrepareTransactionResponse>("/v1/tx/prepare", req),

  submit: (req: SubmitTransactionRequest) =>
    backendClient.post<TransactionStatusResponse>("/v1/tx/submit", req),

  status: (hash: string) =>
    backendClient.get<TransactionStatusResponse>(
      `/v1/tx/${encodeURIComponent(hash)}`
    ),
};

export interface PollStatusOptions {
  timeoutMs?: number;
  intervalMs?: number;
  signal?: AbortSignal;
}

export async function pollTransactionStatus(
  hash: string,
  { timeoutMs = 30_000, intervalMs = 2_000, signal }: PollStatusOptions = {}
): Promise<TransactionStatusResponse> {
  const deadline = Date.now() + timeoutMs;

  while (true) {
    if (signal?.aborted) {
      throw new DOMException("Aborted", "AbortError");
    }
    const status = await txApi.status(hash);
    if (status.status === "SUCCESS" || status.status === "FAILED") {
      return status;
    }
    if (Date.now() + intervalMs > deadline) {
      return status;
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
}
