import type { ErrorCode } from '../types/api.js';

export class ProviderError extends Error {
  readonly code: ErrorCode;
  readonly status: number;
  readonly details?: Record<string, unknown>;

  constructor(
    code: ErrorCode,
    message: string,
    status = 500,
    details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'ProviderError';
    this.code = code;
    this.status = status;
    this.details = details;

    // Maintain proper prototype chain for instanceof checks
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
