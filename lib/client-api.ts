export class ApiError extends Error {
  status: number;
  code: string;
  details?: unknown;
  requestId?: string;

  constructor(
    status: number,
    code: string,
    message: string,
    details?: unknown,
    requestId?: string,
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
    this.requestId = requestId;
  }
}

interface ErrorPayload {
  error?: { code?: string; message?: string; details?: unknown; requestId?: string };
}

export async function api<T>(url: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body && !(init.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  const response = await fetch(url, {
    ...init,
    headers,
    credentials: "same-origin",
  });
  const text = await response.text();
  let payload: unknown = null;
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = null;
    }
  }
  if (!response.ok) {
    const errorPayload = (payload ?? {}) as ErrorPayload;
    throw new ApiError(
      response.status,
      errorPayload.error?.code ?? "request_failed",
      errorPayload.error?.message ??
        (response.status >= 500
          ? "We couldn't complete your request. Please try again later."
          : "We couldn't complete your request. Please try again."),
      errorPayload.error?.details,
      errorPayload.error?.requestId,
    );
  }
  return payload as T;
}

export function errorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof TypeError) {
    return "We couldn't reach the server. Check your connection and try again.";
  }
  if (error instanceof Error && error.message) return error.message;
  return "We couldn't complete your request. Please try again.";
}
