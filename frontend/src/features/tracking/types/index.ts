export interface LocationUpdate {
  lat: number | null;
  lng: number | null;
  updatedAt: string | null;
  connected: boolean;
  eta: number | null;
  nextStop: string;
}
