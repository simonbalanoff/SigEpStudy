import { createContext, useContext, useMemo, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { request } from "../lib/api";
import type { User } from "../types";

interface AuthResponse {
  user: User | null;
}

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<User>;
  register: (input: {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    inviteToken: string;
  }) => Promise<User>;
  logout: () => Promise<void>;
  logoutAll: () => Promise<void>;
  refresh: () => Promise<void>;
  setUser: (user: User) => void;
}

const authQueryKey = ["auth", "me"] as const;

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();

  const userQuery = useQuery({
    queryKey: authQueryKey,
    queryFn: () => request<{ user: User }>("/auth/me"),
    retry: false,
    staleTime: 60_000
  });

  const loginMutation = useMutation({
    mutationFn: (input: { email: string; password: string }) =>
      request<{ user: User }>("/auth/login", {
        method: "POST",
        body: JSON.stringify(input)
      })
  });

  const registerMutation = useMutation({
    mutationFn: (input: {
      firstName: string;
      lastName: string;
      email: string;
      password: string;
      inviteToken: string;
    }) =>
      request<{ user: User }>("/auth/register", {
        method: "POST",
        body: JSON.stringify(input)
      })
  });

  const clearAuthenticatedState = async () => {
    await queryClient.cancelQueries();
    queryClient.setQueryData<AuthResponse>(authQueryKey, { user: null });

    queryClient.removeQueries({
      predicate: (query) => query.queryKey[0] !== "auth"
    });
  };

  const value = useMemo<AuthContextValue>(
    () => ({
      user: userQuery.data?.user ?? null,
      loading: userQuery.isLoading,
      login: async (email, password) => {
        const result = await loginMutation.mutateAsync({ email, password });
        queryClient.setQueryData<AuthResponse>(authQueryKey, result);
        return result.user;
      },
      register: async (input) => {
        const result = await registerMutation.mutateAsync(input);
        queryClient.setQueryData<AuthResponse>(authQueryKey, result);
        return result.user;
      },
      logout: async () => {
        await request<void>("/auth/logout", { method: "POST" });
        await clearAuthenticatedState();
      },
      logoutAll: async () => {
        await request<void>("/auth/logout-all", { method: "POST" });
        await clearAuthenticatedState();
      },
      refresh: async () => {
        await userQuery.refetch();
      },
      setUser: (user) => {
        queryClient.setQueryData<AuthResponse>(authQueryKey, { user });
      }
    }),
    [
      loginMutation,
      queryClient,
      registerMutation,
      userQuery.data,
      userQuery.isLoading,
      userQuery.refetch
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);

  if (!value) {
    throw new Error("useAuth must be used inside AuthProvider");
  }

  return value;
}