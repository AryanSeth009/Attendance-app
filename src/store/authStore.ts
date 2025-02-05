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
  signUp: (
    email: string,
    password: string,
    role: "admin" | "student"
  ) => Promise<void>;
  signOut: () => void;
  checkAuthStatus: () => Promise<void>;
}

const API_URL = Platform.select({
  web: "http://localhost:3000/api",
  android: "http://10.0.2.2:3000/api",
  ios: "http://localhost:3000/api",
  default: "http://localhost:3000/api",
});

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: false,
  error: null,

  signIn: async (email, password) => {
    set({ isLoading: true, error: null });

    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Login failed");
      }

      await SecureStore.setItemAsync("token", data.token);
      await SecureStore.setItemAsync("user", JSON.stringify(data.user));

      set({
        user: {
          id: data.user.id,
          email: data.user.email,
          role: data.user.role,
        },
        isLoading: false,
        error: null,
      });
    } catch (error) {
      set({
        error: error.message || "Login failed",
        isLoading: false,
      });
      throw error;
    }
  },

  signUp: async (email, password, role) => {
    set({ isLoading: true, error: null });

    try {
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

      await SecureStore.setItemAsync("token", data.token);
      await SecureStore.setItemAsync("user", JSON.stringify(data.user));

      set({
        user: {
          id: data.user.id,
          email: data.user.email,
          role: data.user.role,
        },
        isLoading: false,
        error: null,
      });
    } catch (error) {
      set({
        error: error.message || "Registration failed",
        isLoading: false,
      });
      throw error;
    }
  },

  signOut: async () => {
    await SecureStore.deleteItemAsync("token");
    await SecureStore.deleteItemAsync("user");
    set({ user: null, error: null });
  },

  checkAuthStatus: async () => {
    set({ isLoading: true });
    try {
      const token = await SecureStore.getItemAsync("token");
      const storedUser = await SecureStore.getItemAsync("user");

      if (token && storedUser) {
        const user = JSON.parse(storedUser);
        set({ user, isLoading: false });
      } else {
        set({ user: null, isLoading: false });
      }
    } catch (error) {
      set({ 
        user: null, 
        isLoading: false, 
        error: "Authentication check failed" 
      });
    }
  },
}));