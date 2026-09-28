export type RouteStatus = 'ACTIVE' | 'INACTIVE';

export interface Station {
  id: string;
  name: string;
  address: string;
  order: number;
}

export interface BusRoute {
  id: string;
  code: string;
  name: string;
  status: RouteStatus;
  stations: Station[];
}