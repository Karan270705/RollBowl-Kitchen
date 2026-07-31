export class AppError extends Error {
  public readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.code = code;
    this.name = 'AppError';
    
    // Maintain proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AppError);
    }
  }
}

export const normalizeError = (error: unknown): string => {
  if (error instanceof AppError) {
    return error.message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return 'An unexpected error occurred.';
};
