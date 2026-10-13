export type ApiErrorCode =
  | "FORBIDDEN"
  | "INVALID_INPUT"
  | "INTERNAL_ERROR"
  | "NOT_FOUND"
  | "UNAUTHORIZED";

export interface ApiErrorPayload {
  error: {
    code: ApiErrorCode;
    message: string;
  };
}

export class ApiError extends Error {
  readonly code: ApiErrorCode;
  readonly status: number;

  constructor(code: ApiErrorCode, message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.status = status;
  }
}

export function toApiError(error: unknown): ApiError {
  if (error instanceof ApiError) {
    return error;
  }

  if (error instanceof SyntaxError) {
    return new ApiError("INVALID_INPUT", "Request body must be valid JSON", 400);
  }

  return new ApiError("INTERNAL_ERROR", "Internal server error", 500);
}

export function errorResponse(error: unknown): Response {
  const apiError = toApiError(error);
  const payload: ApiErrorPayload = {
    error: { code: apiError.code, message: apiError.message },
  };

  return Response.json(payload, { status: apiError.status });
}

export const invalidInput = (message: string) =>
  new ApiError("INVALID_INPUT", message, 400);

export const notFound = (message = "Resource not found") =>
  new ApiError("NOT_FOUND", message, 404);

export const forbidden = (message = "Forbidden") =>
  new ApiError("FORBIDDEN", message, 403);
