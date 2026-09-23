export type RoleCode = 'ADMIN' | 'MANAGER' | 'DRIVER' | 'PASSENGER';

export interface JwtPayload {
  sub: string;           // User ID (UUID)
  email: string;
  phone: string;
  fullName: string;
  roles: RoleCode[];     // Danh sách mã vai trò được cấp
  permissions: string[]; // Danh sách mã quyền hạn (e.g. 'ticket:validate_qr')
  iat?: number;
  exp?: number;
  iss?: string;
  aud?: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;     // Số giây sống của access token (vd: 900 = 15m)
  tokenType: 'Bearer';
}

export interface AuthenticatedUser {
  id: string;
  email: string;
  phone: string;
  fullName: string;
  roles: RoleCode[];
  permissions: string[];
}
