// src/context/AuthContext.js
import React, {
  createContext,
  useState,
  useEffect,
  useCallback,
  useContext,
} from "react";
import authService from "../services/authService";

export const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuth, setIsAuth] = useState(false);

  /* ================= INITIALIZE AUTH ================= */
  const initializeAuth = useCallback(async () => {
    try {
      const storedUser = authService.getStoredUser();

      if (storedUser && authService.isAuthenticated()) {
        setUser(storedUser);
        setIsAuth(true);

        // Try to refresh user from backend
        try {
          const freshUser = await authService.getCurrentUser();
          if (freshUser) {
            setUser(freshUser);
          }
        } catch (err) {
          console.warn("Could not fetch fresh user data");
        }
      }
    } catch (error) {
      console.error("Auth initialization error:", error);
      setUser(null);
      setIsAuth(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    initializeAuth();
  }, [initializeAuth]);

  /* ================= LOGIN ================= */
  const loginUser = useCallback((userData) => {
    setUser(userData);
    setIsAuth(true);
  }, []);

  /* ================= LOGOUT ================= */
  const logoutUser = useCallback(() => {
    authService.logout();
    setUser(null);
    setIsAuth(false);
  }, []);

  /* ================= REFRESH USER ================= */
  const refreshUser = useCallback(async () => {
    try {
      const freshUser = await authService.getCurrentUser();

      if (freshUser) {
        setUser(freshUser);
        setIsAuth(true);
        return freshUser;
      }

      logoutUser();
      return null;
    } catch (error) {
      console.error("Error refreshing user:", error);
      logoutUser();
      return null;
    }
  }, [logoutUser]);

  /* ================= ROLE HELPERS ================= */
  const hasRole = useCallback(
    (role) => user?.role === role,
    [user]
  );

  const hasAnyRole = useCallback(
    (roles = []) => roles.includes(user?.role),
    [user]
  );

  const value = {
    user,
    loading,
    isAuth,
    loginUser,
    logoutUser,
    refreshUser,
    hasRole,
    hasAnyRole,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

/* ================= CUSTOM HOOK ================= */
export const useAuth = () => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error(
      "useAuth must be used within an AuthProvider"
    );
  }

  return context;
};

export default AuthContext;
