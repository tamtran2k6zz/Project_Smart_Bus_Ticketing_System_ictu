import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Bell } from 'lucide-react';
import { useSession } from '@/store/session.store';
import { useAction } from '@/hooks/useAction';
import { notificationsApi } from '../services/notifications.api';
import { PageTitle, Card, Button, Badge, AsyncState, ActionMessage } from '@/components/ui/Ui';
import { dateTime } from '@/utils/format';
export function NotificationCenter() {
  const user = useSession(s => s.user)!;
  const query = useQuery({
    queryKey: ['notifications', user.id],
    queryFn: () => notificationsApi.list(user.id),
    refetchInterval: 10000,
  });
  const read = useAction(
    (id?: string) => notificationsApi.read(user.id, id),
    'Đã đánh dấu đã đọc.'
  );
  return (
    <>
      <PageTitle
        eyebrow="CẬP NHẬT HÀNH TRÌNH"
        title="Trung tâm thông báo"
        description="Vé, trạm, ưu đãi và phản hồi từ nhà xe."
        action={
          <Button variant="secondary" onClick={() => read.mutate(undefined)}>
            Đánh dấu tất cả đã đọc
          </Button>
        }
      />
      <ActionMessage action={read} />
      <AsyncState query={query} empty={query.data?.length === 0} emptyText="Chưa có thông báo">
        <div className="stack">
          {query.data?.map(n => (
            <Card key={n.id}>
              <div className="between">
                <div className="row">
                  <Bell size={18} color="#15803d" />
                  <strong style={{ fontSize: 14 }}>{n.title}</strong>
                  {!n.read && <Badge>Mới</Badge>}
                </div>
                <small className="muted">{dateTime(n.createdAt)}</small>
              </div>
              <p className="muted">{n.body}</p>
              <div className="row">
                <Link to={n.href}>Xem nội dung</Link>
                {!n.read && (
                  <Button
                    variant="ghost"
                    disabled={read.isPending}
                    onClick={() => read.mutate(n.id)}
                  >
                    Đánh dấu đã đọc
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      </AsyncState>
    </>
  );
}
