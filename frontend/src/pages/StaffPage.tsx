import { StaffTrips, Incidents } from '@/features/operations/components/StaffOperations';
import { ScanTicket } from '@/features/check-in/components/ScanTicket';
export default function StaffPage({ section }: { section: 'trips' | 'scan' | 'incidents' }) {
  return section === 'trips' ? <StaffTrips /> : section === 'scan' ? <ScanTicket /> : <Incidents />;
}
