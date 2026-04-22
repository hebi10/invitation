import { ClientRepositoryError } from './repositoryErrors';

export function requireTrimmedString(
  value: string,
  options: {
    fieldLabel: string;
    message?: string;
  }
) {
  const normalized = value.trim();

  if (!normalized) {
    throw new ClientRepositoryError(
      'INVALID_ARGUMENT',
      options.message ?? `${options.fieldLabel} is required.`
    );
  }

  return normalized;
}
