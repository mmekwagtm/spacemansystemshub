import { QueryClient } from "@tanstack/react-query";

export const queryKeys = {
  profile: (userId: string) => ["profile", userId] as const,
  stores: (filters: Readonly<Record<string, string | number | boolean>>) => ["stores", filters] as const,
  store: (storeId: string) => ["store", storeId] as const,
  items: (storeId: string) => ["items", storeId] as const,
  customerOrders: (customerId: string) => ["customer-orders", customerId] as const,
  merchantOrders: (storeId: string) => ["merchant-orders", storeId] as const,
  activeDriverAssignments: (driverId: string) => ["driver-assignments", driverId] as const,
  notifications: (recipientId: string) => ["notifications", recipientId] as const
};

export function createSpacemanQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        retry: 1,
        refetchOnWindowFocus: false
      },
      mutations: {
        retry: 0
      }
    }
  });
}

export interface RealtimeSubscription {
  unsubscribe(): void;
}
