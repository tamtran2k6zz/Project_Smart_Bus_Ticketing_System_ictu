export interface ApiResponse<T> {
  statusCode: number;
  success: boolean;
  message: string;
  data: T;
  pagination?: {
    page: number;
    limit: number;
    totalItems: number;
    totalPages: number;
  };
  timestamp: string;
}

export interface ApiErrorResponse {
  statusCode: number;
  success: false;
  message: string;
  errors?: string[] | Record<string, any>;
  timestamp: string;
  path: string;
}
