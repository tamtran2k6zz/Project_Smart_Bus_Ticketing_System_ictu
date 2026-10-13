export interface Audit {
  id: string;
  actor: string;
  action: string;
  createdAt: string;
  statusCode?: number;
  method?: string;
  path?: string;
}
