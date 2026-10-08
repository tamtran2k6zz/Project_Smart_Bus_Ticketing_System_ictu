import { DataManager } from '@/components/data-display/DataManager';
import { useSession } from '@/store/session.store';
import { promotionsApi, voucherSchema } from '../services/promotions.api';
import { dateTime } from '@/utils/format';
export function Vouchers() {
  const user = useSession(s => s.user)!;
  return (
    <DataManager
      title="Voucher & khuyến mãi"
      description="Voucher hoạt động được kiểm tra khi dịch vụ tạo đặt vé."
      queryKey="vouchers"
      schema={voucherSchema}
      fields={[
        { name: 'code', label: 'Mã voucher (chữ in hoa / số)' },
        { name: 'percent', label: 'Giảm giá % (1–50)', type: 'number', defaultValue: 10 },
        { name: 'expiresAt', label: 'Hạn dùng (giờ Việt Nam)', type: 'datetime-local' },
        { name: 'active', label: 'Đang hoạt động', type: 'checkbox' },
      ]}
      columns={[
        { key: 'code', label: 'Mã' },
        { key: 'percent', label: 'Giảm %' },
        { key: 'expiresAt', label: 'Hạn dùng', format: v => dateTime(String(v)) },
        { key: 'active', label: 'Hoạt động' },
      ]}
      load={async () => (await promotionsApi.list(user.id)).map(v => ({ ...v }))}
      save={data => promotionsApi.save(user.id, data)}
      remove={id => promotionsApi.remove(user.id, id)}
    />
  );
}
