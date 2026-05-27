import { backendClient } from "./backend-client";

// DTOs mirrored by hand from apps/backend (D15).
// Keep in sync with apps/backend/src/modules/transaction/dto/*.

export interface PrepareTransactionRequest {
  unsignedXdr: string;
}

export interface PrepareTransactionResponse {
  ok: true;
  hash: string;
}

export interface SubmitTransactionRequest {
  signedXdr: string;
}

export type TransactionStatus = "SUCCESS" | "PENDING" | "FAILED" | "NOT_FOUND";

export interface TransactionStatusResponse {
  status: TransactionStatus;
  hash: string;
  returnValue?: string;
  error?: { code: string; message?: string };
  traceId?: string;
}

export const txApi = {
  prepare: (req: PrepareTransactionRequest) =>
    backendClient.post<PrepareTransactionResponse>("/tx/prepare", req),

  submit: (req: SubmitTransactionRequest) =>
    backendClient.post<TransactionStatusResponse>("/tx/submit", req),

  status: (hash: string) =>
    backendClient.get<TransactionStatusResponse>(
      `/tx/${encodeURIComponent(hash)}`
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
    if (status.status !== "PENDING") {
      return status;
    }
    if (Date.now() + intervalMs > deadline) {
      return status;
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
}
