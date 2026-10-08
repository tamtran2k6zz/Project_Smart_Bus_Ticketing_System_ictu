import type { Ticket } from '../types';
export function ticketState(ticket: Ticket, now: number) {
  return ticket.status === 'valid' && Date.parse(ticket.expiresAt) <= now
    ? 'expired'
    : ticket.status;
}
