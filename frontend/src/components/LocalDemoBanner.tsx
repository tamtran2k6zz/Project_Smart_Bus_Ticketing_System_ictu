import { useQuery } from '@tanstack/react-query';
import { request } from '@/services/http';
import { appConfig } from '@/configs/app.config';
export function LocalDemoBanner() {
  const query = useQuery({
    queryKey: ['capabilities'],
    queryFn: () => request<{ localDemo: boolean }>('/capabilities'),
    enabled: !appConfig.demo,
    retry: false,
    staleTime: 60000,
  });
  return query.data?.localDemo ? (
    <div
      role="status"
      style={{
        background: '#fff7d6',
        color: '#713f12',
        padding: '8px 16px',
        textAlign: 'center',
        fontWeight: 600,
      }}
    >
      DEMO API CỤC BỘ · Thanh toán, hóa đơn, email và GPS dùng dữ liệu mô phỏng · Không thu tiền
      thật
    </div>
  ) : null;
}
