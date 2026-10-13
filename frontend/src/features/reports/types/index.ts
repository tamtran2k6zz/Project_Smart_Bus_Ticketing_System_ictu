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
  passRevenue?: number;
  passSales?: { route: string; date: string; revenue: number; orders: number }[];
  rows: ReportRow[];
  revenue: number;
  tickets: number;
  occupancy: number;
  refunds: { id: string; total: number; refund: string }[];
}
