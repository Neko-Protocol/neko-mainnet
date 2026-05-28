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

export type TransactionStatus = "SUCCESS" | "FAILED" | "PENDING" | "NOT_FOUND";

export interface TransactionStatusError {
  code: string;
  message?: string;
}

export interface TransactionStatusResponse {
  status: TransactionStatus;
  hash: string;
  returnValue?: string;
  error?: TransactionStatusError;
  traceId?: string;
}
