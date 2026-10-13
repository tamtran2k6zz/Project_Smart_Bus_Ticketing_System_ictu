export interface Pass {
  id: string;
  userId: string;
  routeId: string;
  expiresAt: string;
  price: number;
  status: 'active' | 'pending' | 'revoked';
  token?: string;
  redirectUrl?: string;
  orderId?: string;
}
export interface Eligibility {
  id: string;
  userId: string;
  category: string;
  document: string;
  status: 'pending' | 'approved' | 'rejected';
}
