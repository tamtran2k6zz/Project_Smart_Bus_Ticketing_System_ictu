import { TripSearch, TripDetail } from '@/features/booking/components/Trips';
export default function TripsPage({ detail = false }: { detail?: boolean }) {
  return detail ? <TripDetail /> : <TripSearch />;
}
