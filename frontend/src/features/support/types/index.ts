export interface SupportRequest {
  id: string;
  userId: string;
  subject: string;
  message: string;
  rating: number;
  status: 'open' | 'resolved';
  reply: string;
  createdAt: string;
}
