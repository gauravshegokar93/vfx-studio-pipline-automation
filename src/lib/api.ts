import axios from "axios";
import { ENDPOINTS } from "@/config/api";
import type { LoginApiRequest, LoginApiResult } from "@/types/auth";

export async function loginApi(
  data: LoginApiRequest
): Promise<LoginApiResult> {
  try {
    const response = await axios.post<LoginApiResult>(
      ENDPOINTS.AUTH + "/login",
      data,
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      if (error.response?.data) {
        return error.response.data as LoginApiResult;
      }
      if (error.request) {
        return {
          success: false,
          message: "Network error. Please check your connection.",
        };
      }
    }

    return {
      success: false,
      message: "An unexpected error occurred. Please try again.",
    };
  }
}

export async function logoutApi(
  accessToken: string,
  refreshToken: string
): Promise<{ success: boolean; message?: string }> {
  try {
    const response = await axios.post(
      ENDPOINTS.AUTH + "/logout",
      { refreshToken },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      if (error.response?.data) {
        return error.response.data as { success: boolean; message?: string };
      }
      if (error.request) {
        return {
          success: false,
          message: "Network error. Please check your connection.",
        };
      }
    }

    return {
      success: false,
      message: "An unexpected error occurred. Please try again.",
    };
  }
}
