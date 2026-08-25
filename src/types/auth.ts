export interface LoginFormData {
  username: string;
  password: string;
  rememberMe: boolean;
}

export interface LoginApiRequest {
  email: string;
  password: string;
}

export interface LoginUser {
  id: number;
  employeeCode: string;
  fullName: string;
  email: string;
  roleId: number;
  roleName: string;
  departmentId: number;
  departmentName: string;
  teamId: number;
  teamName: string;
  isActive: boolean;
  permissions?: string[];
}

export interface LoginApiResponse {
  success: true;
  accessToken: string;
  refreshToken: string;
  user: LoginUser;
}

export interface LoginApiError {
  success: false;
  message: string;
}

export type LoginApiResult = LoginApiResponse | LoginApiError;
