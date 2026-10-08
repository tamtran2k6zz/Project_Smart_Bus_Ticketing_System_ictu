import { TicketList, TicketDetail } from '@/features/tickets/components/Tickets';
export default function TicketsPage({ detail = false }: { detail?: boolean }) {
  return detail ? <TicketDetail /> : <TicketList />;
}
