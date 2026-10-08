import { Passes } from '@/features/passes/components/Passes';
import { NotificationCenter } from '@/features/notifications/components/NotificationCenter';
import { Support } from '@/features/support/components/Support';
import { Profile } from '@/features/auth/components/Profile';
export default function AccountPage({
  section,
}: {
  section: 'passes' | 'notifications' | 'support' | 'profile';
}) {
  return section === 'passes' ? (
    <Passes />
  ) : section === 'notifications' ? (
    <NotificationCenter />
  ) : section === 'support' ? (
    <Support />
  ) : (
    <Profile />
  );
}
