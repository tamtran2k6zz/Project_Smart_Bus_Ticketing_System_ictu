function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error) return error.message;
  if (!isRecord(error)) return fallback;

  const response = error.response;
  if (isRecord(response) && isRecord(response.data)) {
    const message = response.data.message;
    if (typeof message === 'string') return message;
  }
  return typeof error.message === 'string' ? error.message : fallback;
}
