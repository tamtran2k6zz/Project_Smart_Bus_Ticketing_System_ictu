import { Checkout, PaymentResult } from '@/features/payments/components/Checkout';
export default function PaymentPage({ result = false }: { result?: boolean }) {
  return result ? <PaymentResult /> : <Checkout />;
}
