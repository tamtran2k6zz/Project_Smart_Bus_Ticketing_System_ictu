import { Navigate, Outlet } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import type { Permission, Role } from '@/features/auth/types';
import { useSession } from '@/store/session.store';
import { can } from '@/configs/permissions';
import { authApi } from '@/features/auth/services/auth.api';
export default function PermissionGuard({
  permission,
  roles,
}: {
  permission?: Permission;
  roles?: Role[];
}) {
  const local = useSession(s => s.user);
  const { data: user } = useQuery({
    queryKey: ['session', local?.id],
    queryFn: () => authApi.session(local!.id),
    enabled: !!local,
  });
  if (!user) return null;
  return (permission && !can(user, permission)) || (roles && !roles.includes(user.role)) ? (
    <Navigate to="/403" replace />
  ) : (
    <Outlet />
  );
}
