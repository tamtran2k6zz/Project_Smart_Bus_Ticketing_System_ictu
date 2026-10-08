import { useQuery } from '@tanstack/react-query';
import {
  DataManager,
  type DataField,
  type DataColumn,
} from '@/components/data-display/DataManager';
import { useSession } from '@/store/session.store';
import { operationsApi, type Resource } from '../services/operations.api';
import { resourceSchemas } from '../schemas/resources';
import { adminApi } from '@/features/administration/services/admin.api';
import { dateTime, money } from '@/utils/format';
export function ResourceManager({ resource }: { resource: Resource }) {
  const user = useSession(s => s.user)!;
  const catalog = useQuery({ queryKey: ['catalog'], queryFn: operationsApi.catalog });
  const staff = useQuery({
    queryKey: ['operations', 'staff', user.id],
    queryFn: () => operationsApi.list('staff', user.id),
  });
  const drivers = useQuery({
    queryKey: ['drivers', user.id],
    queryFn: () => adminApi.drivers(user.id),
    enabled: resource === 'staff',
  });
  const stops = catalog.data?.stops.map(s => ({ value: s.name, label: s.name })) || [];
  const routeOptions = catalog.data?.routes.map(r => ({ value: r.id, label: r.name })) || [];
  const vehicleOptions =
    catalog.data?.vehicles.map(v => ({ value: v.id, label: v.plate + ' · ' + v.name })) || [];
  const tripOptions =
    catalog.data?.trips.map(t => ({
      value: t.id,
      label:
        dateTime(t.departure) + ' · ' + catalog.data?.routes.find(r => r.id === t.routeId)?.name,
    })) || [];
  const fields: Record<Resource, DataField[]> = {
    routes: [
      { name: 'code', label: 'Mã tuyến (ít nhất 2 ký tự)' },
      { name: 'name', label: 'Tên tuyến' },
      { name: 'origin', label: 'Điểm đầu', type: 'select', options: stops },
      { name: 'destination', label: 'Điểm cuối', type: 'select', options: stops },
      { name: 'price', label: 'Giá vé (VND)', type: 'number', defaultValue: 15000 },
      { name: 'active', label: 'Hoạt động', type: 'checkbox' },
      {
        name: 'stopIds',
        label: 'Trạm đi qua theo thứ tự',
        type: 'ordered',
        options: catalog.data?.stops.map(s => ({ value: s.id, label: s.name })),
      },
    ],
    stops: [
      { name: 'name', label: 'Tên trạm' },
      { name: 'address', label: 'Địa chỉ' },
      { name: 'lat', label: 'Vĩ độ', type: 'number', defaultValue: 21.58 },
      { name: 'lng', label: 'Kinh độ', type: 'number', defaultValue: 105.83 },
    ],
    vehicles: [
      { name: 'plate', label: 'Biển số' },
      { name: 'name', label: 'Tên xe' },
      { name: 'capacity', label: 'Sức chứa (1–80)', type: 'number', defaultValue: 30 },
      { name: 'active', label: 'Hoạt động', type: 'checkbox' },
    ],
    staff: [
      { name: 'name', label: 'Họ tên' },
      { name: 'phone', label: 'Số điện thoại' },
      {
        name: 'userId',
        label: 'Tài khoản tài xế',
        type: 'select',
        options: drivers.data?.map(u => ({ value: u.id, label: u.name + ' · ' + u.email })),
      },
    ],
    trips: [
      { name: 'routeId', label: 'Tuyến', type: 'select', options: routeOptions },
      { name: 'vehicleId', label: 'Xe', type: 'select', options: vehicleOptions },
      { name: 'departure', label: 'Khởi hành (giờ Việt Nam)', type: 'datetime-local' },
      { name: 'duration', label: 'Thời gian (phút)', type: 'number', defaultValue: 35 },
      { name: 'seatMode', label: 'Hỗ trợ chọn ghế', type: 'checkbox' },
      {
        name: 'status',
        label: 'Trạng thái',
        type: 'select',
        defaultValue: 'scheduled',
        options: [
          { value: 'scheduled', label: 'Chờ khởi hành' },
          { value: 'running', label: 'Đang chạy' },
          { value: 'completed', label: 'Hoàn thành' },
        ],
      },
    ],
    assignments: [
      { name: 'tripId', label: 'Chuyến', type: 'select', options: tripOptions },
      { name: 'vehicleId', label: 'Xe', type: 'select', options: vehicleOptions },
      {
        name: 'staffId',
        label: 'Nhân sự',
        type: 'select',
        options: staff.data?.map(s => ({ value: s.id, label: 'name' in s ? s.name : s.id })),
      },
    ],
  };
  const name = (key: 'routes' | 'vehicles' | 'trips', id: unknown) =>
    key === 'routes'
      ? catalog.data?.routes.find(r => r.id === id)?.name
      : key === 'vehicles'
        ? catalog.data?.vehicles.find(v => v.id === id)?.plate
        : catalog.data?.trips.find(t => t.id === id)
          ? dateTime(catalog.data!.trips.find(t => t.id === id)!.departure)
          : String(id);
  const columns: Record<Resource, DataColumn[]> = {
    routes: [
      { key: 'code', label: 'Mã' },
      { key: 'name', label: 'Tên tuyến' },
      { key: 'origin', label: 'Điểm đi' },
      { key: 'destination', label: 'Điểm đến' },
      { key: 'price', label: 'Giá', format: v => money(Number(v)) },
      { key: 'active', label: 'Hoạt động' },
    ],
    stops: [
      { key: 'name', label: 'Trạm' },
      { key: 'address', label: 'Địa chỉ' },
      { key: 'lat', label: 'Vĩ độ' },
      { key: 'lng', label: 'Kinh độ' },
    ],
    vehicles: [
      { key: 'plate', label: 'Biển số' },
      { key: 'name', label: 'Xe' },
      { key: 'capacity', label: 'Sức chứa' },
      { key: 'active', label: 'Hoạt động' },
    ],
    staff: [
      { key: 'name', label: 'Nhân sự' },
      { key: 'phone', label: 'Điện thoại' },
      { key: 'userId', label: 'Tài khoản' },
    ],
    trips: [
      { key: 'routeId', label: 'Tuyến', format: v => name('routes', v) || String(v) },
      { key: 'departure', label: 'Khởi hành', format: v => dateTime(String(v)) },
      { key: 'vehicleId', label: 'Xe', format: v => name('vehicles', v) || String(v) },
      { key: 'price', label: 'Giá', format: v => money(Number(v)) },
      { key: 'seatMode', label: 'Chọn ghế' },
    ],
    assignments: [
      { key: 'tripId', label: 'Khởi hành', format: v => name('trips', v) || String(v) },
      { key: 'vehicleId', label: 'Xe', format: v => name('vehicles', v) || String(v) },
      {
        key: 'staffId',
        label: 'Nhân sự',
        format: v => {
          const row = staff.data?.find(s => s.id === v);
          return row && 'name' in row ? row.name : String(v);
        },
      },
    ],
  };
  const titles = {
    routes: 'Tuyến & giá vé',
    stops: 'Trạm dừng',
    vehicles: 'Đội xe',
    staff: 'Nhân sự',
    trips: 'Lịch chạy',
    assignments: 'Phân công chuyến',
  };
  return (
    <DataManager
      key={resource}
      title={titles[resource]}
      description="Thay đổi danh mục demo được phản ánh vào tra cứu và các màn hình liên quan."
      fields={fields[resource]}
      columns={columns[resource]}
      schema={resourceSchemas[resource]}
      queryKey={'resource-' + resource}
      load={async () => (await operationsApi.list(resource, user.id)).map(row => ({ ...row }))}
      save={data => operationsApi.save(resource, user.id, data)}
      remove={id => operationsApi.remove(resource, user.id, id)}
    />
  );
}
