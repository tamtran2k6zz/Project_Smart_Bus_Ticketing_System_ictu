import { Vouchers } from '@/features/promotions/components/Vouchers';
import { EligibilityReview } from '@/features/passes/components/EligibilityReview';
import { UserManagement, AuditLog } from '@/features/administration/components/Administration';
import { Support } from '@/features/support/components/Support';
export default function AdminPage({
  section,
}: {
  section: 'promotions' | 'eligibility' | 'users' | 'audit' | 'support';
}) {
  return section === 'promotions' ? (
    <Vouchers />
  ) : section === 'eligibility' ? (
    <EligibilityReview />
  ) : section === 'users' ? (
    <UserManagement />
  ) : section === 'audit' ? (
    <AuditLog />
  ) : (
    <Support admin />
  );
}
