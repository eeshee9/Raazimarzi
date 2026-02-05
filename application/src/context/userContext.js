import React, { createContext, useState, useEffect, useContext } from "react";
import api from "../api/axios";

// ✅ Capitalized Context name
const UserContext = createContext();

export const UserProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // ✅ Fetch user profile on mount
  useEffect(() => {
    fetchUserProfile();
  }, []);

  const fetchUserProfile = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        setLoading(false);
        return;
      }

      const res = await api.get("/users/me");
      setUser(res.data);
    } catch (err) {
      console.error("❌ Failed to fetch user profile:", err);

      if (err.response?.status === 401) {
        localStorage.removeItem("token");
        setUser(null);
      }
    } finally {
      setLoading(false);
    }
  };

  // ✅ Update user profile
  const updateUser = async (updatedData) => {
    try {
      const res = await api.put("/users/update", updatedData);
      setUser(res.data);
      return { success: true, data: res.data };
    } catch (err) {
      console.error("❌ Failed to update profile:", err);
      return {
        success: false,
        error: err.response?.data?.message || "Update failed",
      };
    }
  };

  // ✅ Logout
  const logout = () => {
    localStorage.removeItem("token");
    setUser(null);
  };

  return (
    <UserContext.Provider
      value={{
        user,
        setUser,
        loading,
        updateUser,
        logout,
        refetchUser: fetchUserProfile,
      }}
    >
      {children}
    </UserContext.Provider>
  );
};

// ✅ Custom hook
export const useUser = () => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error("useUser must be used within UserProvider");
  }
  return context;
};

export default UserContext;
