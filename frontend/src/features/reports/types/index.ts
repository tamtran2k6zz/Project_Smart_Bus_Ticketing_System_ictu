export interface ReportRow {
  routeId: string;
  route: string;
  date: string;
  revenue: number;
  tickets: number;
  capacity: number;
  occupancy: number;
}
export interface Report {
  rows: ReportRow[];
  revenue: number;
  tickets: number;
  occupancy: number;
  refunds: { id: string; total: number; refund: string }[];
}
