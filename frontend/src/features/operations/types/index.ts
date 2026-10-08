export interface Route {
  id: string;
  name: string;
  code: string;
  origin: string;
  destination: string;
  price: number;
  stopIds: string[];
  active: boolean;
}
export interface Stop {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
}
export interface Vehicle {
  id: string;
  plate: string;
  name: string;
  capacity: number;
  active: boolean;
}
export interface Staff {
  id: string;
  name: string;
  phone: string;
  userId: string;
}
export interface Assignment {
  id: string;
  tripId: string;
  vehicleId: string;
  staffId: string;
}
export interface Incident {
  id: string;
  tripId: string;
  message: string;
  createdAt: string;
  resolved: boolean;
}
