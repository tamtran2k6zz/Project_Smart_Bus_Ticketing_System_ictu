import { useQuery } from '@tanstack/react-query';
import { useSession } from '@/store/session.store';
import { useAction } from '@/hooks/useAction';
import { passesApi } from '../services/passes.api';
import { PageTitle, Card, Badge, Button, AsyncState, ActionMessage } from '@/components/ui/Ui';
export function EligibilityReview() {
  const user = useSession(s => s.user)!;
  const query = useQuery({
    queryKey: ['eligibility', user.id],
    queryFn: () => passesApi.pending(user.id),
  });
  const action = useAction(
    ({ id, approve }: { id: string; approve: boolean }) => passesApi.review(user.id, id, approve),
    'Đã xử lý hồ sơ.'
  );
  return (
    <>
      <PageTitle
        title="Duyệt đối tượng ưu đãi"
        description="Hồ sơ demo chỉ chứa mã giấy tờ giả, không tải chứng từ thật."
      />
      <ActionMessage action={action} />
      <AsyncState
        query={query}
        empty={query.data?.length === 0}
        emptyText="Không có hồ sơ đang chờ"
      >
        <div className="stack">
          {query.data?.map(e => (
            <Card key={e.id}>
              <div className="between">
                <div>
                  <Badge tone="amber">Chờ duyệt</Badge>
                  <h3>{e.category}</h3>
                  <p className="muted">
                    Tài khoản: {e.userId} · Mã: {e.document}
                  </p>
                </div>
                <div className="row">
                  <Button
                    disabled={action.isPending}
                    onClick={() => action.mutate({ id: e.id, approve: true })}
                  >
                    Duyệt ưu đãi
                  </Button>
                  <Button
                    variant="secondary"
                    disabled={action.isPending}
                    onClick={() => action.mutate({ id: e.id, approve: false })}
                  >
                    Từ chối
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </AsyncState>
    </>
  );
}
