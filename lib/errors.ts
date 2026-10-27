import { NextResponse } from "next/server";
import { ZodError } from "zod";

export class AppError extends Error {
  status: number;
  code: string;
  details?: unknown;

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    // Use explicit names. Production minification changes class identifiers,
    // so new.target.name would become something like "n" in server logs.
    this.name = "AppError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = "Sign in to continue.") {
    super(401, "unauthorized", message);
    this.name = "UnauthorizedError";
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "You do not have access to this resource.") {
    super(403, "forbidden", message);
    this.name = "ForbiddenError";
  }
}

export class NotFoundError extends AppError {
  constructor(message = "Not found.") {
    super(404, "not_found", message);
    this.name = "NotFoundError";
  }
}

export class ValidationError extends AppError {
  constructor(message = "Please check the submitted values.", details?: unknown) {
    super(422, "validation_error", message, details);
    this.name = "ValidationError";
  }
}

export class InsufficientCreditsError extends AppError {
  constructor(required: number, available: number) {
    super(
      402,
      "insufficient_credits",
      `This generation needs ${required.toLocaleString()} credits, but only ${available.toLocaleString()} are available.`,
      { required, available },
    );
    this.name = "InsufficientCreditsError";
  }
}

export class ProviderError extends AppError {
  provider: string;

  constructor(provider: string, message: string, status = 502, details?: unknown) {
    super(status, "provider_error", message, details);
    this.name = "ProviderError";
    this.provider = provider;
  }
}

export interface ErrorContext {
  request?: Request;
  operation?: string;
  requestId?: string;
}

const REQUEST_ID_PATTERN = /^[A-Za-z0-9._:-]{8,128}$/;
const MAX_LOG_MESSAGE_LENGTH = 500;

function createRequestId(): string {
  try {
    return globalThis.crypto.randomUUID();
  } catch {
    return `req_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
  }
}

function requestIdFromRequest(request?: Request): string | undefined {
  if (!request) return undefined;
  const supplied =
    request.headers.get("x-request-id") ?? request.headers.get("x-correlation-id");
  return supplied && REQUEST_ID_PATTERN.test(supplied) ? supplied : undefined;
}

/**
 * Build one correlation ID per request. Pass the returned context to both
 * logWarning/logInfo and errorResponse so a user-facing failure can be matched
 * to its server log entry.
 */
export function requestContext(request: Request, operation: string): ErrorContext {
  return {
    request,
    operation,
    requestId: requestIdFromRequest(request) ?? createRequestId(),
  };
}

export function authNotConfiguredMessage(): string {
  if (process.env.NODE_ENV === "production") {
    return "Sign-in is temporarily unavailable because the server authentication secret is not configured. Contact the studio owner.";
  }
  return "Sign-in is unavailable because AUTH_SECRET is not configured. Add a 32+ character AUTH_SECRET to .env.local and restart the server.";
}

export function authNotConfiguredError(): AppError {
  return new AppError(503, "auth_not_configured", authNotConfiguredMessage());
}

type ErrorCategory =
  | "validation"
  | "application"
  | "auth_configuration"
  | "auth_provider"
  | "database_unavailable"
  | "database_connection"
  | "database_conflict"
  | "database_invalid_text"
  | "storage_unavailable"
  | "session"
  | "unexpected";

function errorCodeOf(error: unknown): string | undefined {
  if (!error || typeof error !== "object") return undefined;
  const code = (error as { code?: unknown }).code;
  return typeof code === "string" ? code : undefined;
}

function errorNameOf(error: unknown): string {
  if (error instanceof Error) return error.name || "Error";
  return typeof error;
}

function errorMessageOf(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  return String(error);
}

function isAuthSecretError(error: unknown): boolean {
  return /AUTH_SECRET must be configured/i.test(errorMessageOf(error));
}

function isDatabaseUnavailableError(error: unknown): boolean {
  return errorNameOf(error) === "DatabaseUnavailableError";
}

function isInvalidTextError(error: unknown): boolean {
  const code = errorCodeOf(error);
  if (code === "22P05" || code === "22021") return true;
  return /invalid byte sequence for encoding|unsupported Unicode escape sequence|null character not allowed|character with byte sequence .* has no equivalent/i.test(
    errorMessageOf(error),
  );
}

function isUniqueViolation(error: unknown): boolean {
  return errorCodeOf(error) === "23505";
}

function isConnectionError(error: unknown): boolean {
  const code = errorCodeOf(error);
  if (
    code &&
    new Set([
      "ECONNREFUSED",
      "ENOTFOUND",
      "EAI_AGAIN",
      "ETIMEDOUT",
      "EHOSTUNREACH",
      "ENETUNREACH",
      "57P01",
      "57P02",
      "57P03",
      "08000",
      "08001",
      "08003",
      "08006",
      "53300",
    ]).has(code)
  ) {
    return true;
  }
  return /ECONNREFUSED|ENOTFOUND|EAI_AGAIN|ETIMEDOUT|EHOSTUNREACH|ENETUNREACH|connection terminated|connection refused|timeout expired|too many clients|password authentication failed|getaddrinfo/i.test(
    errorMessageOf(error),
  );
}

function isStorageError(error: unknown): boolean {
  const message = errorMessageOf(error);
  const code = errorCodeOf(error);
  const storageCode = code ? ["EROFS", "EACCES", "EPERM"].includes(code) : false;
  const storageTarget = /\.data|whisk-flow-db|uploads|auth-secret|read-only file system|mkdir/i.test(
    message,
  );
  return (storageCode || /read-only file system/i.test(message)) && storageTarget;
}

function isAuthProviderError(error: unknown): boolean {
  const name = errorNameOf(error);
  const message = errorMessageOf(error);
  if (/Supabase is not configured/i.test(message)) return true;
  if (name === "AuthRetryableFetchError" || name === "AuthApiError") return true;
  return /supabase|auth service/i.test(message) &&
    /fetch|network|timeout|ECONN|ENOTFOUND|502|503|504/i.test(message);
}

function isSessionError(error: unknown): boolean {
  const name = errorNameOf(error);
  const message = errorMessageOf(error);
  return (
    /AuthSessionMissing|JWTExpired|JWSSignatureVerificationFailed/i.test(name) ||
    /session (?:is )?(?:missing|expired|invalid)|invalid session|jwt (?:expired|invalid)/i.test(
      message,
    )
  );
}

function categoryFor(error: unknown): ErrorCategory {
  if (error instanceof ZodError) return "validation";
  if (error instanceof AppError) {
    if (error.code === "auth_not_configured") return "auth_configuration";
    if (error.code === "database_unavailable") return "database_unavailable";
    if (error.code === "storage_unavailable") return "storage_unavailable";
    return "application";
  }
  if (isAuthSecretError(error)) return "auth_configuration";
  if (isDatabaseUnavailableError(error)) return "database_unavailable";
  if (isInvalidTextError(error)) return "database_invalid_text";
  if (isUniqueViolation(error)) return "database_conflict";
  if (isConnectionError(error)) return "database_connection";
  if (isStorageError(error)) return "storage_unavailable";
  if (isAuthProviderError(error)) return "auth_provider";
  if (isSessionError(error)) return "session";
  return "unexpected";
}

function safeDatabaseUnavailableMessage(error: unknown): string {
  const message = errorMessageOf(error);
  if (/DATABASE_URL is missing|tables are missing|migration|persistent|Vercel/i.test(message)) {
    return message;
  }
  if (/Could not connect to PostgreSQL/i.test(message)) {
    return "Could not connect to the database. Check DATABASE_URL and that the database is running.";
  }
  return "The database is temporarily unavailable. Please try again in a moment.";
}

function redactLogMessage(message: string): string {
  return message
    .replace(/postgres(?:ql)?:\/\/[^\s"']+/gi, "postgres://[redacted]")
    .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, "[redacted-email]")
    .replace(/\b(?:sk|pk|sbp|sbs|eyJ)[A-Za-z0-9._-]{12,}\b/g, "[redacted-token]")
    .replace(/[\u0000-\u001F\u007F]/g, " ")
    .slice(0, MAX_LOG_MESSAGE_LENGTH);
}

function logDiagnostic(
  error: unknown,
  status: number,
  code: string,
  category: ErrorCategory,
  context: ErrorContext,
  requestId: string,
) {
  const message =
    error instanceof ZodError
      ? `Validation failed for ${error.issues.length} field(s)`
      : redactLogMessage(errorMessageOf(error));
  const meta = {
    requestId,
    operation: context.operation ?? "api",
    category,
    status,
    code,
    error: errorNameOf(error),
    message,
  };
  if (status >= 500) {
    console.error("[whisk-flow] API error", meta);
  } else {
    console.warn("[whisk-flow] API error", meta);
  }
}

function jsonError(
  status: number,
  code: string,
  message: string,
  details: unknown,
  requestId: string,
): NextResponse {
  return NextResponse.json(
    {
      error: {
        code,
        message,
        ...(details === undefined ? {} : { details }),
        requestId,
      },
    },
    {
      status,
      headers: {
        "Cache-Control": "no-store",
        "X-Request-ID": requestId,
      },
    },
  );
}

export function errorResponse(error: unknown, context: ErrorContext = {}): NextResponse {
  const requestId =
    context.requestId ?? requestIdFromRequest(context.request) ?? createRequestId();
  const resolvedContext = { ...context, requestId };

  let status: number;
  let code: string;
  let message: string;
  let details: unknown;

  if (error instanceof ZodError) {
    status = 422;
    code = "validation_error";
    message = "Please check the submitted values.";
    details = error.issues.map((issue) => ({
      path: issue.path.join("."),
      message: issue.message,
    }));
  } else if (error instanceof AppError) {
    status = error.status;
    code = error.code;
    message = error.message;
    details = error.details;
  } else if (isAuthSecretError(error)) {
    status = 503;
    code = "auth_not_configured";
    message = authNotConfiguredMessage();
  } else if (/Supabase is not configured/i.test(errorMessageOf(error))) {
    status = 503;
    code = "supabase_not_configured";
    message = "Authentication is not configured on this server. Contact the studio owner.";
  } else if (isDatabaseUnavailableError(error)) {
    status = 503;
    code = "database_unavailable";
    message = safeDatabaseUnavailableMessage(error);
  } else if (isInvalidTextError(error)) {
    status = 422;
    code = "invalid_text";
    message =
      "Some of the text contains characters that can't be saved. Remove special characters and try again.";
  } else if (isUniqueViolation(error)) {
    status = 409;
    code = "conflict";
    message = "That value is already in use. Refresh the page and try again.";
  } else if (isConnectionError(error)) {
    status = 503;
    code = "database_unavailable";
    message = "The database is temporarily unavailable. Please try again in a moment.";
  } else if (isStorageError(error)) {
    status = 503;
    code = "storage_unavailable";
    message =
      "The server cannot write its local data in this environment. Configure persistent storage and try again.";
  } else if (isAuthProviderError(error)) {
    status = 503;
    code = "auth_provider_unavailable";
    message = "We couldn't reach the authentication service. Please try again in a moment.";
  } else if (isSessionError(error)) {
    status = 401;
    code = "session_invalid";
    message = "Your session has expired. Sign in again.";
  } else {
    status = 500;
    code = "internal_error";
    message = "We couldn't complete your request. Please try again later.";
  }

  const category = categoryFor(error);
  logDiagnostic(error, status, code, category, resolvedContext, requestId);
  return jsonError(status, code, message, details, requestId);
}

export function logWarning(message: string, meta?: Record<string, unknown>) {
  console.warn(`[whisk-flow] ${message}`, meta ?? {});
}

export function logInfo(message: string, meta?: Record<string, unknown>) {
  console.info(`[whisk-flow] ${message}`, meta ?? {});
}
