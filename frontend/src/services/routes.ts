import type { BusRoute, Station } from '../types/route';

const routesUrl = '/api/v1/routes';

interface ApiResponse<T> {
  data: T;
  message?: string;
  errors?: string[];
}

interface SaveRouteInput {
  code: string;
  name: string;
  status: BusRoute['status'];
  stations: Array<Pick<Station, 'name' | 'address' | 'order'>>;
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...init?.headers,
    },
  });
  const body = (await response.json()) as ApiResponse<T> & { message?: string };

  if (!response.ok) {
    const details = body.errors?.join('; ');
    throw new Error(
      details ? `${body.message ?? 'Request failed'}: ${details}` : (body.message ?? `Request failed (${response.status})`),
    );
  }

  return body.data;
}

export function getRoutes(): Promise<BusRoute[]> {
  return request<BusRoute[]>(routesUrl);
}

export function saveRoute(route: BusRoute): Promise<BusRoute> {
  const payload: SaveRouteInput = {
    code: route.code,
    name: route.name,
    status: route.status,
    stations: route.stations.map(({ name, address, order }) => ({
      name,
      address,
      order,
    })),
  };
  const isUpdate = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    route.id,
  );

  return request<BusRoute>(isUpdate ? `${routesUrl}/${route.id}` : routesUrl, {
    method: isUpdate ? 'PUT' : 'POST',
    body: JSON.stringify(payload),
  });
}

export function deleteRoute(id: string): Promise<{ id: string }> {
  return request<{ id: string }>(`${routesUrl}/${id}`, { method: 'DELETE' });
}
