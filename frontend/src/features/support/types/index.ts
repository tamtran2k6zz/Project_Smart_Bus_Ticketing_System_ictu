export interface SupportRequest {
  tripId?: string;
  id: string;
  userId: string;
  subject: string;
  message: string;
  rating: number;
  status: 'open' | 'resolved';
  reply: string;
  createdAt: string;
}
