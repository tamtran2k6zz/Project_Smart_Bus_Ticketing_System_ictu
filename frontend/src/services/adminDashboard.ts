export interface BusStopSummary {
  id: string;
  name: string;
  code: string;
  isActive: boolean;
}

interface ApiResponse<T> {
  data: T;
  message?: string;
  errors?: string[];
}

export async function getBusStops(): Promise<BusStopSummary[]> {
  const response = await fetch('/api/v1/bus-stops');
  const contentType = response.headers.get('content-type') ?? '';
  if (!contentType.includes('application/json')) {
    throw new Error('API trạm dừng không trả về JSON. Kiểm tra kết nối backend.');
  }

  const body = (await response.json()) as ApiResponse<BusStopSummary[]>;
  if (!response.ok) {
    throw new Error(body.message ?? `Không thể tải danh sách trạm (${response.status}).`);
  }
  if (!Array.isArray(body.data)) {
    throw new Error('Dữ liệu trạm dừng trả về không hợp lệ.');
  }

  return body.data;
}
