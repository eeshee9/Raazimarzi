// src/services/authService.js
import axios from "axios";

/* ================= API CONFIG ================= */

const API_URL =
  process.env.REACT_APP_API_URL || "http://localhost:5000/api";

const AUTH_ENDPOINT = `${API_URL}/auth`;

/* ================= SIGNUP ================= */
const signup = async (userData) => {
  try {
    const response = await axios.post(
      `${AUTH_ENDPOINT}/signup`,
      userData
    );

    if (response.data?.success && response.data?.token) {
      localStorage.setItem("token", response.data.token);
      localStorage.setItem(
        "user",
        JSON.stringify(response.data.user)
      );
    }

    return response.data;
  } catch (error) {
    throw error.response?.data || { message: "Signup failed" };
  }
};

/* ================= LOGIN ================= */
const login = async (email, password) => {
  try {
    const response = await axios.post(`${AUTH_ENDPOINT}/login`, {
      email,
      password,
    });

    if (response.data?.success && response.data?.token) {
      localStorage.setItem("token", response.data.token);
      localStorage.setItem(
        "user",
        JSON.stringify(response.data.user)
      );
    }

    return response.data;
  } catch (error) {
    throw error.response?.data || { message: "Login failed" };
  }
};

/* ================= LOGOUT ================= */
const logout = () => {
  localStorage.clear();
};

/* ================= GET CURRENT USER ================= */
const getCurrentUser = async () => {
  try {
    const token = getToken();
    if (!token) return null;

    const response = await axios.get(`${AUTH_ENDPOINT}/me`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (response.data?.success) {
      localStorage.setItem(
        "user",
        JSON.stringify(response.data.user)
      );
      return response.data.user;
    }

    return null;
  } catch (error) {
    if (error.response?.status === 401) {
      logout();
    }
    return null;
  }
};

/* ================= PASSWORD FLOW ================= */
const forgotPassword = async (email) => {
  try {
    const response = await axios.post(
      `${AUTH_ENDPOINT}/forgot-password`,
      { email }
    );
    return response.data;
  } catch (error) {
    throw error.response?.data || {
      message: "Failed to send OTP",
    };
  }
};

const verifyOtp = async (email, otp) => {
  try {
    const response = await axios.post(
      `${AUTH_ENDPOINT}/verify-otp`,
      { email, otp }
    );
    return response.data;
  } catch (error) {
    throw error.response?.data || {
      message: "OTP verification failed",
    };
  }
};

const resetPassword = async (email, otp, newPassword) => {
  try {
    const response = await axios.post(
      `${AUTH_ENDPOINT}/reset-password`,
      { email, otp, newPassword }
    );
    return response.data;
  } catch (error) {
    throw error.response?.data || {
      message: "Password reset failed",
    };
  }
};

/* ================= HELPERS ================= */
const getToken = () => localStorage.getItem("token");

const getStoredUser = () => {
  const userStr = localStorage.getItem("user");
  return userStr ? JSON.parse(userStr) : null;
};

const isAuthenticated = () => Boolean(getToken());

const getUserRole = () => getStoredUser()?.role || null;

const hasRole = (role) => getUserRole() === role;

const hasAnyRole = (roles = []) =>
  roles.includes(getUserRole());

/* ================= EXPORT (FIXED) ================= */
const authService = {
  signup,
  login,
  logout,
  getCurrentUser,
  forgotPassword,
  verifyOtp,
  resetPassword,
  getToken,
  getStoredUser,
  isAuthenticated,
  getUserRole,
  hasRole,
  hasAnyRole,
};

export default authService;
