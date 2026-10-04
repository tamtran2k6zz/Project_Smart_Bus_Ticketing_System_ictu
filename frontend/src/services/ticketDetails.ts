import { apiFetch, getApiUrl } from '../api/client';
import type { TicketDetail } from '../types/ticket';

export async function getTicketDetail(
  ticketCode: string,
): Promise<TicketDetail> {
  const response = await apiFetch(
    getApiUrl(
      `/api/v1/tickets/${encodeURIComponent(ticketCode)}`,
    ),
  );

  const result: unknown = await response.json();

  if (!response.ok) {
    const message =
      typeof result === 'object' &&
      result !== null &&
      'message' in result &&
      typeof result.message === 'string'
        ? result.message
        : 'Không thể tải chi tiết vé';

    throw new Error(message);
  }

  return result as TicketDetail;
}