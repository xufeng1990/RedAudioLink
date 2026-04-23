import { QueryClient } from "@tanstack/react-query";
import { adminQueryFn } from "./api";

export const adminQueryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: adminQueryFn as any,
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: 30_000,
      retry: false,
    },
    mutations: { retry: false },
  },
});
