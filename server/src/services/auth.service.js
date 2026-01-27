import API from "../utils/api";

/* REGISTER */
export const registerUser = async (data) => {
  const res = await fetch(`${API}/users/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  return res.json();
};

/* LOGIN */
export const loginUser = async (data) => {
  const res = await fetch(`${API}/users/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  return res.json();
};

/* FORGOT PASSWORD */
export const sendOTP = async (email) => {
  const res = await fetch(`${API}/users/forgot-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });

  return res.json();
};

/* VERIFY OTP */
export const verifyOTP = async (data) => {
  const res = await fetch(`${API}/users/verify-otp`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  return res.json();
};

/* RESET PASSWORD */
export const resetPassword = async (data) => {
  const res = await fetch(`${API}/users/reset-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  return res.json();
};
