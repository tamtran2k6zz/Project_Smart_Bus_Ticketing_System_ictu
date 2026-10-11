export interface LocationUpdate {
  lat: number;
  lng: number;
  updatedAt: string;
  connected: boolean;
  eta: number | null;
  nextStop: string;
}
