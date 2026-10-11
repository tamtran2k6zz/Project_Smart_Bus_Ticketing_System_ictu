export interface LocationUpdate {
  lat: number;
  lng: number;
  updatedAt: string;
  connected: boolean;
  eta: number;
  nextStop: string;
}

export type BusOperatingStatus = 'running' | 'stopped' | 'standby' | 'incident' | 'offline';

export interface FleetBusStatus {
  vehicleId: string;
  plate: string;
  name: string;
  capacity: number;
  currentTripId?: string;
  routeId?: string;
  routeCode?: string;
  routeName?: string;
  driverId?: string;
  driverName?: string;
  driverPhone?: string;
  status: BusOperatingStatus;
  speed: number; // km/h
  lat: number;
  lng: number;
  heading: number; // 0 - 360 degrees
  nextStop?: string;
  etaMinutes?: number;
  passengerCount: number;
  occupancyPercent: number;
  tempCelsius: number;
  hasAC: boolean;
  fuelOrBattery: number; // percentage 0 - 100
  lastPingAt: string;
  connected: boolean;
  incidentAlert?: string;
}
