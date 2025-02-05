import { create } from "zustand";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

interface User {
  id: string;
  email: string;
  role: "admin" | "student";
}

interface AuthState {
  user: User | null;
  isLoading: boolean;
  error: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, role: "admin" | "student") => Promise<void>;
  signOut: () => void;
  checkAuthStatus: () => Promise<void>;
}

// Get the development machine's IP address. Replace this with your machine's IP address
const DEV_MACHINE_IP = '192.168.0.104'; // Update this to your computer's IP address

const API_URL = Platform.select({
  web: "http://localhost:3000/api",
  // Android emulator needs the special 10.0.2.2 IP to access the host machine
  android: __DEV__ 
    ? `http://${DEV_MACHINE_IP}:3000/api`  // Development
    : "http://your-production-api.com/api", // Production
  // iOS simulator can use localhost
  ios: __DEV__
    ? `http://${DEV_MACHINE_IP}:3000/api`  // Development
    : "http://your-production-api.com/api", // Production
  default: "http://localhost:3000/api",
});

// Helper function to handle storage based on platform
const storage = {
  setItem: async (key: string, value: string) => {
    if (Platform.OS === 'web') {
      localStorage.setItem(key, value);
    } else {
      await SecureStore.setItemAsync(key, value);
    }
  },
  getItem: async (key: string) => {
    if (Platform.OS === 'web') {
      return localStorage.getItem(key);
    }
    return await SecureStore.getItemAsync(key);
  },
  removeItem: async (key: string) => {
    if (Platform.OS === 'web') {
      localStorage.removeItem(key);
    } else {
      await SecureStore.deleteItemAsync(key);
    }
  }
};

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: false,
  error: null,

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

      const response = await fetch(`${API_URL}/auth/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password, role }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Registration failed");
      }

      await storage.setItem("token", data.token);
      await storage.setItem("user", JSON.stringify(data.user));

      set({ 
        user: {
          id: data.user.id,
          email: data.user.email,
          role: data.user.role,
        },
        isLoading: false,
        error: null
      });
    } catch (error) {
      set({ 
        error: error.message || "Registration failed",
        isLoading: false,
        user: null
      });
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
      const userStr = await storage.getItem("user");

      if (token && userStr) {
        const user = JSON.parse(userStr);
        set({ user, error: null });
      } else {
        set({ user: null });
      }
    } catch (error) {
      console.error("Error checking auth status:", error);
      set({ user: null });
    }
  },
}));