
export interface AuthResponse {
  token: string;
  email: string;
  role: string;
  userId?: number;
  message: string;
}