import { ErrorCode } from "@neko/api-contracts";
import {
  CONTRACT_ERRORS,
  ContractErrorCode,
  isValidErrorCode,
  getContractError,
} from "./contract-errors.js";

function isLikelyTransportError(message: string): boolean {
  const normalized = message.toLowerCase();
  const transportPatterns = [
    "failed to fetch",
    "networkerror",
    "network error",
    "timeout",
    "timed out",
    "econn",
    "enotfound",
    "eai_again",
    "socket hang up",
  ];
  return transportPatterns.some((pattern) => normalized.includes(pattern));
}

function extractContractNameFromError(errorString: string): string | null {
  const contractPatterns = [
    { pattern: /rwa-lending/i, name: "rwa-lending" },
    { pattern: /rwa-token/i, name: "rwa-token" },
    { pattern: /rwa-oracle/i, name: "rwa-oracle" },
    { pattern: /lending/i, name: "rwa-lending" },
    { pattern: /token/i, name: "rwa-token" },
    { pattern: /oracle/i, name: "rwa-oracle" },
  ];

  for (const { pattern, name } of contractPatterns) {
    if (pattern.test(errorString)) {
      return name;
    }
  }

  return null;
}

function stringifyError(error: unknown): string {
  if (typeof error === "object" && error !== null) {
    const errorObj = error as Record<string, unknown>;
    if (typeof errorObj.message === "string") {
      return errorObj.message;
    }
    if (errorObj.name && errorObj.message) {
      return `${String(errorObj.name)}: ${String(errorObj.message)}`;
    }
    try {
      const stringified = JSON.stringify(error);
      return stringified === "{}" || stringified === '{""}'
        ? "Unknown error"
        : stringified;
    } catch {
      return "An unexpected error occurred";
    }
  }
  return String(error);
}

export function extractContractError(
  error: unknown,
  contractName?: string
): string {
  if (!error) {
    return "An unknown error occurred";
  }

  const errorString = stringifyError(error);

  const contractErrorMatch = errorString.match(/Error\(Contract,\s*#(\d+)\)/);
  if (contractErrorMatch) {
    const errorCode = parseInt(contractErrorMatch[1], 10);

    const inferredContract =
      contractName || extractContractNameFromError(errorString);
    if (inferredContract) {
      const contractError = getContractError(inferredContract, errorCode);
      if (contractError) {
        return contractError.message;
      }
      return `Contract error #${errorCode}`;
    }

    if (isValidErrorCode(errorCode)) {
      return CONTRACT_ERRORS[errorCode].message;
    }

    return `Contract error #${errorCode}`;
  }

  const hostErrorMatch = errorString.match(
    /HostError:.*Error\(Contract,\s*#(\d+)\)/
  );
  if (hostErrorMatch) {
    const errorCode = parseInt(hostErrorMatch[1], 10);

    const inferredContract =
      contractName || extractContractNameFromError(errorString);
    if (inferredContract) {
      const contractError = getContractError(inferredContract, errorCode);
      if (contractError) {
        return contractError.message;
      }
      return `Contract error #${errorCode}`;
    }

    if (isValidErrorCode(errorCode)) {
      return CONTRACT_ERRORS[errorCode].message;
    }

    return `Contract error #${errorCode}`;
  }

  if (errorString.includes("simulation failed")) {
    const innerMatch = errorString.match(/Error\(Contract,\s*#(\d+)\)/);
    if (innerMatch) {
      const errorCode = parseInt(innerMatch[1], 10);

      const inferredContract =
        contractName || extractContractNameFromError(errorString);
      if (inferredContract) {
        const contractError = getContractError(inferredContract, errorCode);
        if (contractError) {
          return contractError.message;
        }
      }

      if (isValidErrorCode(errorCode)) {
        return CONTRACT_ERRORS[errorCode].message;
      }
    }
    return "Transaction simulation failed. Please check your inputs and try again.";
  }

  if (
    errorString.toLowerCase().includes("user rejected") ||
    errorString.toLowerCase().includes("user denied") ||
    errorString.toLowerCase().includes("cancelled")
  ) {
    return "Transaction was cancelled by user";
  }

  if (
    errorString.toLowerCase().includes("insufficient funds") ||
    errorString.toLowerCase().includes("insufficient balance")
  ) {
    return "Insufficient funds for this transaction";
  }

  if (isLikelyTransportError(errorString)) {
    return "Network error. Please check your connection and try again.";
  }

  const cleanedError = errorString
    .replace(/Error:/gi, "")
    .replace(/\s+/g, " ")
    .trim();

  if (
    cleanedError.length > 150 ||
    cleanedError.includes("0x") ||
    cleanedError.includes("wasm")
  ) {
    return "Transaction failed. Please try again or contact support if the issue persists.";
  }

  const finalError = cleanedError || "An unexpected error occurred";
  if (finalError === "[object Object]" || finalError.includes("[object ")) {
    return "Transaction failed. Please try again.";
  }

  return finalError;
}

export function getContractErrorCode(error: unknown): string | null {
  if (!error) return null;

  const errorString = String(error);
  const match = errorString.match(/Error\(Contract,\s*#(\d+)\)/);

  if (match) {
    const errorCode = parseInt(match[1], 10);
    if (isValidErrorCode(errorCode)) {
      return CONTRACT_ERRORS[errorCode].code;
    }
  }

  return null;
}

export function isContractError(
  error: unknown,
  errorCode: ContractErrorCode
): boolean {
  if (!error) return false;

  const errorString = String(error);
  const match = errorString.match(/Error\(Contract,\s*#(\d+)\)/);

  if (match) {
    const extractedCode = parseInt(match[1], 10);
    return extractedCode === errorCode;
  }

  return false;
}

export function isUserCancellationError(error: unknown): boolean {
  if (!error) return false;

  const errorString = String(error).toLowerCase();

  const cancellationPatterns = [
    "user rejected",
    "user denied",
    "user declined",
    "cancelled",
    "canceled",
    "rejected the request",
    "user canceled",
    "user cancelled",
    "action_cancelled",
    "request rejected",
    "transaction rejected",
    "signature rejected",
    "4001",
    "-32000",
    "-32603",
  ];

  return cancellationPatterns.some((pattern) => errorString.includes(pattern));
}

export function extractContractErrorOrNull(
  error: unknown,
  contractName?: string
): string | null {
  if (isUserCancellationError(error)) {
    return null;
  }

  return extractContractError(error, contractName);
}

/**
 * Stable error code for the generic (non-catalog) branches of
 * extractContractError, so callers can localize instead of rendering the
 * English fallback message directly. Mirrors extractContractError's branch
 * order so a given error always classifies to the matching code + message
 * pair. Returns null for a recognized catalog contract error (message is
 * already specific) or for opaque provider text with no stable meaning.
 */
export function getGenericErrorCode(
  error: unknown,
  contractName?: string
): ErrorCode | null {
  if (!error) return null;
  if (isUserCancellationError(error)) return ErrorCode.USER_CANCELLED;

  const errorString = stringifyError(error);

  const contractErrorMatch =
    errorString.match(/Error\(Contract,\s*#(\d+)\)/) ??
    errorString.match(/HostError:.*Error\(Contract,\s*#(\d+)\)/);
  if (contractErrorMatch) {
    const errorCode = parseInt(contractErrorMatch[1], 10);
    const inferredContract =
      contractName || extractContractNameFromError(errorString);
    const known = inferredContract
      ? getContractError(inferredContract, errorCode)
      : isValidErrorCode(errorCode)
        ? CONTRACT_ERRORS[errorCode]
        : null;
    return known ? null : ErrorCode.UNKNOWN_CONTRACT_ERROR;
  }

  if (errorString.includes("simulation failed")) {
    return ErrorCode.SIMULATION_FAILED;
  }

  if (
    errorString.toLowerCase().includes("insufficient funds") ||
    errorString.toLowerCase().includes("insufficient balance")
  ) {
    return ErrorCode.INSUFFICIENT_FUNDS;
  }

  if (isLikelyTransportError(errorString)) {
    return ErrorCode.NETWORK_ERROR;
  }

  const cleanedError = errorString
    .replace(/Error:/gi, "")
    .replace(/\s+/g, " ")
    .trim();

  if (
    cleanedError.length > 150 ||
    cleanedError.includes("0x") ||
    cleanedError.includes("wasm")
  ) {
    return ErrorCode.UNKNOWN_CONTRACT_ERROR;
  }

  const finalError = cleanedError || "An unexpected error occurred";
  if (finalError === "[object Object]" || finalError.includes("[object ")) {
    return ErrorCode.UNKNOWN_CONTRACT_ERROR;
  }

  return null;
}
