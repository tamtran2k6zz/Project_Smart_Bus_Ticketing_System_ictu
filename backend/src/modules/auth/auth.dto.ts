export interface RegisterDto {
  email: string;
  phone: string;
  password: string;
  fullName: string;
}

export interface LoginDto {
  identifier: string; // Cho phép đăng nhập bằng Email hoặc Số điện thoại
  password: string;
}

export interface UserResponseDto {
  id: string;
  email: string;
  phone: string;
  fullName: string;
  avatarUrl: string | null;
  status: string;
  roles: string[];
  createdAt: string;
}

export interface AuthResponseDto {
  user: UserResponseDto;
  tokens: {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
    tokenType: string;
  };
}
