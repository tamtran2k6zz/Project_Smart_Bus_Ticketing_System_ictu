import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useSession } from '@/store/session.store';
import { authApi } from '@/features/auth/services/auth.api';
import { AsyncState } from '@/components/ui/Ui';
export default function ProtectedRoute() {
  const user = useSession(state => state.user);
  const location = useLocation();
  const session = useQuery({
    queryKey: ['session', user?.id],
    queryFn: () => authApi.session(user!.id),
    enabled: !!user,
    retry: false,
    staleTime: 0,
  });
  if (!user || session.isError)
    return (
      <Navigate
        to={'/login?redirect=' + encodeURIComponent(location.pathname + location.search)}
        replace
      />
    );
  return <AsyncState query={session}>{session.data && <Outlet />}</AsyncState>;
}
