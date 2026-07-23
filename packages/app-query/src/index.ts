import type { PageRequest } from "@spaceman/app-database";
import type { MarketplaceService } from "@spaceman/app-services";
import type {
  ReviewStoreSubmissionInput,
  SetItemAvailabilityInput,
  SubmitMerchantStoreInput,
  UpsertItemInput,
  UpsertStoreInput,
} from "@spaceman/app-types";
import {
  QueryClient,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

export { QueryClientProvider } from "@tanstack/react-query";

export const queryKeys = {
  profile: (userId: string) => ["profile", userId] as const,
  stores: (filters: object) => ["stores", filters] as const,
  store: (storeId: string) => ["store", storeId] as const,
  items: (storeId: string) => ["items", storeId] as const,
  merchantStores: (merchantId: string) =>
    ["merchant-stores", merchantId] as const,
  pendingMerchantStores: (merchantId: string) =>
    ["pending-merchant-stores", merchantId] as const,
  adminStores: () => ["admin-stores"] as const,
  importBatch: (batchId: string) => ["import-batch", batchId] as const,
  importRows: (batchId: string) => ["import-rows", batchId] as const,
  customerOrders: (customerId: string) =>
    ["customer-orders", customerId] as const,
  merchantOrders: (storeId: string) => ["merchant-orders", storeId] as const,
  activeDriverAssignments: (driverId: string) =>
    ["driver-assignments", driverId] as const,
  notifications: (recipientId: string) =>
    ["notifications", recipientId] as const,
};

export function createSpacemanQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        retry: 1,
        refetchOnWindowFocus: false,
      },
      mutations: {
        retry: 0,
      },
    },
  });
}

export interface RealtimeSubscription {
  unsubscribe(): void;
}

export function useActiveStores(
  service: MarketplaceService,
  request?: PageRequest,
) {
  return useQuery({
    queryKey: [...queryKeys.stores(request ?? {}), request?.cursor ?? "first"],
    queryFn: () => service.listActiveStores(request),
  });
}

export function useActiveItems(
  service: MarketplaceService,
  storeId: string | undefined,
  request?: PageRequest,
) {
  return useQuery({
    queryKey: [...queryKeys.items(storeId ?? "none"), request ?? {}],
    queryFn: () => service.listActiveItems(storeId ?? "", request),
    enabled: Boolean(storeId),
  });
}

export function useMerchantStores(
  service: MarketplaceService,
  merchantId: string | undefined,
  request?: PageRequest,
  enabled = true,
) {
  return useQuery({
    queryKey: [
      ...queryKeys.merchantStores(merchantId ?? "none"),
      request ?? {},
    ],
    queryFn: () => service.listMerchantStores(merchantId ?? "", request),
    enabled: enabled && Boolean(merchantId),
  });
}

export function usePendingMerchantStores(
  service: MarketplaceService,
  merchantId: string | undefined,
  request?: PageRequest,
  enabled = true,
) {
  return useQuery({
    queryKey: [
      ...queryKeys.pendingMerchantStores(merchantId ?? "none"),
      request ?? {},
    ],
    queryFn: () => service.listPendingMerchantStores(merchantId ?? "", request),
    enabled: enabled && Boolean(merchantId),
  });
}

export function useAdminStores(
  service: MarketplaceService,
  request?: PageRequest,
) {
  return useQuery({
    queryKey: [...queryKeys.adminStores(), request ?? {}],
    queryFn: () => service.listAdminStores(request),
  });
}

export function useSaveAdminStore(service: MarketplaceService) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: UpsertStoreInput) => service.saveAdminStore(input),
    onSuccess: () =>
      client.invalidateQueries({ queryKey: queryKeys.adminStores() }),
  });
}

export function useManagedItems(
  service: MarketplaceService,
  storeId: string | undefined,
  request?: PageRequest,
) {
  return useQuery({
    queryKey: [...queryKeys.items(storeId ?? "none"), "managed", request ?? {}],
    queryFn: () => service.listManagedItems(storeId ?? "", request),
    enabled: Boolean(storeId),
  });
}

export function useImportRows(
  service: MarketplaceService,
  batchId: string | undefined,
) {
  return useQuery({
    queryKey: queryKeys.importRows(batchId ?? "none"),
    queryFn: () => service.listImportRows(batchId ?? "", { limit: 50 }),
    enabled: Boolean(batchId),
  });
}

export function useSubmitMerchantStore(
  service: MarketplaceService,
  merchantId: string,
) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: SubmitMerchantStoreInput) =>
      service.submitMerchantStore(input),
    onSuccess: () =>
      client.invalidateQueries({
        queryKey: queryKeys.merchantStores(merchantId),
      }),
  });
}

export function useReviewStore(service: MarketplaceService) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: ReviewStoreSubmissionInput) =>
      service.reviewStore(input),
    onSuccess: () =>
      client.invalidateQueries({ queryKey: queryKeys.adminStores() }),
  });
}

export function useSaveItem(service: MarketplaceService, storeId: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: UpsertItemInput) => service.saveItem(input),
    onSuccess: () =>
      client.invalidateQueries({ queryKey: queryKeys.items(storeId) }),
  });
}

export function useSetItemAvailability(
  service: MarketplaceService,
  storeId: string,
) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: SetItemAvailabilityInput) =>
      service.setItemAvailability(input),
    onSuccess: () =>
      client.invalidateQueries({ queryKey: queryKeys.items(storeId) }),
  });
}
