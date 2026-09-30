export type FareType = 'FLAT_FARE' | 'STAGE_FARE';
export type TicketType = 'SINGLE' | 'MONTHLY_STUDENT' | 'MONTHLY_REGULAR' | 'PRIORITY';

export interface FareConfiguration {
  id: string;
  routeId: string;
  fareType: FareType;
  ticketType: TicketType;
  amount: number | string;
  fromStop?: { name: string } | null;
  toStop?: { name: string } | null;
  route?: { code: string; name: string } | null;
  isActive: boolean;
  effectiveFrom: string;
  effectiveTo?: string | null;
}

interface ApiResponse<T> {
  data: T;
  message?: string;
  errors?: string[];
}

interface ApiRoute {
  id: string;
  code: string;
  name: string;
  routeStops: Array<{
    stop: { id: string; name: string };
  }>;
  fares: Array<{
    id: string;
    routeId: string;
    fareType: FareType;
    ticketType: TicketType;
    amount: number | string;
    fromStopId?: string | null;
    toStopId?: string | null;
    isActive: boolean;
    effectiveFrom: string;
    effectiveTo?: string | null;
    deletedAt?: string | null;
  }>;
}

export async function getFares(): Promise<FareConfiguration[]> {
  const response = await fetch('/api/v1/routes');
  const contentType = response.headers.get('content-type') ?? '';
  if (!contentType.includes('application/json')) {
    throw new Error('API tuyến xe không trả về JSON. Kiểm tra kết nối backend.');
  }

  const body = (await response.json()) as ApiResponse<ApiRoute[]>;
  if (!response.ok) {
    throw new Error(body.message ?? `Không thể tải dữ liệu giá vé (${response.status}).`);
  }
  if (!Array.isArray(body.data)) {
    throw new Error('Dữ liệu tuyến xe trả về không hợp lệ.');
  }

  return body.data.flatMap(route => {
    const stopsById = new Map((Array.isArray(route.routeStops) ? route.routeStops : []).map(({ stop }) => [stop?.id, stop]));
    return (route.fares ?? [])
      .filter(fare => !fare.deletedAt)
      .map(fare => ({
        ...fare,
        route: { code: route.code, name: route.name },
        fromStop: fare.fromStopId ? stopsById.get(fare.fromStopId) : null,
        toStop: fare.toStopId ? stopsById.get(fare.toStopId) : null,
      }));
  });
}
