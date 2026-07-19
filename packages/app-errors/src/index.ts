export const APP_ERROR_CODES = [
  "authentication_required",
  "authorization_denied",
  "conflict",
  "invalid_input",
  "not_found",
  "precondition_failed",
  "provider_unavailable",
  "rate_limited",
  "service_unavailable",
  "unknown"
] as const;
export type AppErrorCode = (typeof APP_ERROR_CODES)[number];

export interface AppErrorOptions {
  code: AppErrorCode;
  source: string;
  message: string;
  userMessage: string;
  debug?: Record<string, unknown>;
  cause?: unknown;
}

export class AppError extends Error {
  readonly code: AppErrorCode;
  readonly source: string;
  readonly userMessage: string;
  readonly debug?: Record<string, unknown>;

  constructor(options: AppErrorOptions) {
    super(options.message, { cause: options.cause });
    this.name = "AppError";
    this.code = options.code;
    this.source = options.source;
    this.userMessage = options.userMessage;
    if (options.debug !== undefined) {
      this.debug = options.debug;
    }
  }
}

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

export function toAppError(error: unknown, fallback: Omit<AppErrorOptions, "cause">): AppError {
  if (isAppError(error)) {
    return error;
  }

  return new AppError({ ...fallback, cause: error });
}

export function toSafeLogContext(error: AppError): Record<string, unknown> {
  return {
    code: error.code,
    source: error.source,
    message: error.message,
    debug: error.debug
  };
}
