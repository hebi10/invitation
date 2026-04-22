export type ClientRepositoryErrorCode =
  | 'INVALID_ARGUMENT'
  | 'NOT_FOUND'
  | 'UNAVAILABLE';

export class ClientRepositoryError extends Error {
  readonly code: ClientRepositoryErrorCode;

  constructor(code: ClientRepositoryErrorCode, message: string) {
    super(message);
    this.name = 'ClientRepositoryError';
    this.code = code;
  }
}
