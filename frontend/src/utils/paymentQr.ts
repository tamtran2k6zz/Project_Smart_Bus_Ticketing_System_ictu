export interface PaymentQrPayloadInput {
  orderId: string;
  ticketCode: string;
  tripId: string;
  routeCode: string;
  routeName: string;
  departureTime: string;
  seatNumber: string;
  amount: number;
  expiresAt: string | null;
}

export function buildPaymentQrPayload(input: PaymentQrPayloadInput): string {
  return JSON.stringify({
    ...input,
    type: 'SMARTBUS_PAYMENT',
    version: 1,
    status: 'PENDING',
    currency: 'VND',
  });
}
