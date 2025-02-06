import { create } from "zustand";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

// Helper function to handle storage based on platform
export const storage = {
  setItem: async (key: string, value: string) => {
    try {
      if (Platform.OS === 'web') {
        localStorage.setItem(key, value);
        return true;
      } else {
        await SecureStore.setItemAsync(key, value);
        return true;
      }
    } catch (error) {
      console.error('Storage setItem error:', error);
      return false;
    }
  },
  getItem: async (key: string) => {
    try {
      if (Platform.OS === 'web') {
        return localStorage.getItem(key);
      }
      return await SecureStore.getItemAsync(key);
    } catch (error) {
      console.error('Storage getItem error:', error);
      return null;
    }
  },
  removeItem: async (key: string) => {
    try {
      if (Platform.OS === 'web') {
        localStorage.removeItem(key);
        return true;
      } else {
        await SecureStore.deleteItemAsync(key);
        return true;
      }
    } catch (error) {
      console.error('Storage removeItem error:', error);
      return false;
    }
  }
};

interface User {
  id: string;
  email: string;
  role: "admin" | "student";
  studentId?: string;
  enrollmentDate?: string;
}

interface AuthState {
  user: User | null;
  isLoading: boolean;
  error: string | null;
  savedEmail: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, role: "admin" | "student") => Promise<void>;
  signOut: () => void;
  checkAuthStatus: () => Promise<void>;
  loadSavedEmail: () => Promise<void>;
}

// Get the development machine's IP address
const DEV_MACHINE_IP = Platform.OS === 'android' ? '10.0.2.2' : 'localhost';

const API_URL = Platform.select({
  web: "http://localhost:3000/api",
  android: __DEV__
    ? `http://${DEV_MACHINE_IP}:3000/api`
    : "http://your-production-api.com/api",
  ios: __DEV__
    ? "http://localhost:3000/api"
    : "http://your-production-api.com/api",
  default: "http://localhost:3000/api",
});

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: false,
  error: null,
  savedEmail: null,

  loadSavedEmail: async () => {
    try {
      const email = await storage.getItem("savedEmail");
      if (email) {
        set({ savedEmail: email });
      }
    } catch (error) {
      console.error("Error loading saved email:", error);
    }
  },

  signIn: async (email, password) => {
    set({ isLoading: true, error: null });

    try {
      console.log('Making request to:', API_URL); // Debug log
      const response = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to sign in");
      }

      // Save email for future use
      await storage.setItem("savedEmail", email);

      // Store the token and user data securely
      await storage.setItem("token", data.token);
      await storage.setItem("user", JSON.stringify({
        id: data.user.id,
        email: data.user.email,
        role: data.user.role
      }));
      
      set({ 
        user: {
          id: data.user.id,
          email: data.user.email,
          role: data.user.role
        },
        savedEmail: email,
        isLoading: false,
        error: null
      });
    } catch (error) {
      console.error('Sign in error:', error); // Debug log
      set({ 
        error: error.message || "Failed to sign in",
        isLoading: false,
        user: null
      });
      throw error;
    }
  },

  signUp: async (email, password, role) => {
    set({ isLoading: true, error: null });

    try {
      // Validate email
      if (!email || !email.trim()) {
        throw new Error("Email is required");
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        throw new Error("Please enter a valid email address");
      }

      // Validate password
      if (!password || password.length < 6) {
        throw new Error("Password must be at least 6 characters long");
      }

      // Validate role
      if (!role || (role !== "student" && role !== "admin")) {
        throw new Error("Invalid role selected");
      }

      const response = await fetch(`${API_URL}/auth/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          password,
          role,
          studentId: role === "student" ? email.split("@")[0] : undefined,
          enrollmentDate: role === "student" ? new Date().toISOString() : undefined
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Registration failed");
      }

      // Store the token and user data securely
      await storage.setItem("token", data.token);
      await storage.setItem("user", JSON.stringify({
        id: data.user.id,
        email: data.user.email,
        role: data.user.role,
        ...(data.user.role === "student" && {
          studentId: data.user.studentId,
          enrollmentDate: data.user.enrollmentDate
        })
      }));

      set({
        user: {
          id: data.user.id,
          email: data.user.email,
          role: data.user.role,
          ...(data.user.role === "student" && {
            studentId: data.user.studentId,
            enrollmentDate: data.user.enrollmentDate
          })
        },
        isLoading: false,
        error: null
      });
    } catch (error: any) {
      set({ isLoading: false, error: error.message });
      throw error;
    }
  },

  signOut: async () => {
    try {
      await storage.removeItem("token");
      await storage.removeItem("user");
      set({ user: null, error: null });
    } catch (error) {
      console.error("Error during sign out:", error);
    }
  },

  checkAuthStatus: async () => {
    try {
      const token = await storage.getItem("token");
      const userData = await storage.getItem("user");

      if (token && userData) {
        const user = JSON.parse(userData);
        set({ user, isLoading: false, error: null });
        
        // Verify token is still valid with backend
        const response = await fetch(`${API_URL}/auth/verify`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        
        if (!response.ok) {
          // Token invalid, clear storage
          await storage.removeItem("token");
          await storage.removeItem("user");
          set({ user: null });
        }
      }
    } catch (error) {
      console.error("Error checking auth status:", error);
      set({ user: null, isLoading: false });
    }
  },
}));