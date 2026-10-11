import { Vouchers } from '@/features/promotions/components/Vouchers';
import { EligibilityReview } from '@/features/passes/components/EligibilityReview';
import { UserManagement, AuditLog } from '@/features/administration/components/Administration';
import { Support } from '@/features/support/components/Support';
import { FleetMonitoring } from '@/features/tracking/components/FleetMonitoring';

export default function AdminPage({
  section,
}: {
  section: 'promotions' | 'eligibility' | 'users' | 'audit' | 'support' | 'fleet';
}) {
  return section === 'promotions' ? (
    <Vouchers />
  ) : section === 'eligibility' ? (
    <EligibilityReview />
  ) : section === 'users' ? (
    <UserManagement />
  ) : section === 'audit' ? (
    <AuditLog />
  ) : section === 'fleet' ? (
    <FleetMonitoring />
  ) : (
    <Support admin />
  );
}
