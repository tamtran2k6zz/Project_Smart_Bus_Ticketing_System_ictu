import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useSession } from '@/store/session.store';
import { useAction } from '@/hooks/useAction';
import { operationsApi } from '../services/operations.api';
import {
  PageTitle,
  Card,
  Badge,
  Button,
  AsyncState,
  ActionMessage,
  LinkButton,
} from '@/components/ui/Ui';
import { dateTime } from '@/utils/format';
import { can } from '@/configs/permissions';
import { QuickIncidentReport } from './QuickIncidentReport';

export function StaffTrips() {
  const user = useSession(s => s.user)!;
  const query = useQuery({
    queryKey: ['assigned', user.id],
    queryFn: () => operationsApi.assigned(user.id),
  });
  const catalog = useQuery({ queryKey: ['catalog'], queryFn: operationsApi.catalog });
  return (
    <>
      <PageTitle
        title="Chuyến được phân công"
        description="Kiểm tra hành trình, mở soát vé và báo sự cố cho chuyến của bạn."
      />
      <AsyncState
        query={query}
        empty={query.data?.length === 0}
        emptyText="Bạn chưa được phân công chuyến"
      >
        <div className="stack">
          {query.data?.map(t => (
            <Card key={t.id}>
              <div className="between">
                <div>
                  <Badge>
                    {t.status === 'running'
                      ? 'Đang chạy'
                      : t.status === 'completed'
                        ? 'Hoàn thành'
                        : 'Lịch chạy'}
                  </Badge>
                  <h3>{catalog.data?.routes.find(r => r.id === t.routeId)?.name}</h3>
                  <p className="muted">
                    {dateTime(t.departure)} ·{' '}
                    {catalog.data?.vehicles.find(v => v.id === t.vehicleId)?.plate}
                  </p>
                </div>
                <div className="row">
                  <LinkButton to={'/staff/scan?tripId=' + t.id}>Soát vé</LinkButton>
                  <Link to={'/tracking/' + t.id}>Theo dõi</Link>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </AsyncState>
    </>
  );
}

export function Incidents() {
  const user = useSession(s => s.user)!;
  const assigned = useQuery({
    queryKey: ['assigned', user.id],
    queryFn: () => operationsApi.assigned(user.id),
  });
  const query = useQuery({ queryKey: ['incidents'], queryFn: () => operationsApi.incidents() });
  const resolve = useAction(
    (id: string) => operationsApi.resolveIncident(user.id, id),
    'Đã đánh dấu sự cố được xử lý.'
  );
  const allowed = new Set(assigned.data?.map(t => t.id));

  return (
    <>
      <PageTitle
        title="Sự cố hành trình"
        description="Báo nhanh tình huống trên đường để điều hành nắm tình hình và hỗ trợ."
      />
      <QuickIncidentReport userId={user.id} trips={assigned.data ?? []} />

      <div className="between">
        <h2>Lịch sử sự cố</h2>
        <ActionMessage action={resolve} />
      </div>
      <AsyncState
        query={query}
        empty={query.data?.filter(i => allowed.has(i.tripId)).length === 0}
        emptyText="Chưa có sự cố"
      >
        <div className="stack">
          {query.data
            ?.filter(i => allowed.has(i.tripId))
            .map(i => (
              <Card key={i.id}>
                <div className="between">
                  <Badge tone={i.resolved ? 'green' : 'amber'}>
                    {i.resolved ? 'Đã xử lý' : 'Đang xử lý'}
                  </Badge>
                  <small className="muted">{dateTime(i.createdAt)}</small>
                </div>
                <p>{i.message}</p>
                <small className="muted">Chuyến {i.tripId}</small>
                {can(user, 'operations') && !i.resolved && (
                  <Button variant="secondary" onClick={() => resolve.mutate(i.id)}>
                    Đánh dấu đã xử lý
                  </Button>
                )}
              </Card>
            ))}
        </div>
      </AsyncState>
    </>
  );
}
