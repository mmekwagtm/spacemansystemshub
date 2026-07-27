import type { PageRequest } from "@spaceman/app-database";
import type {
  CheckoutAdminService,
  CheckoutService,
  MarketplaceService,
} from "@spaceman/app-services";
import type {
  CreateCheckoutSessionInput,
  InitializePaystackPaymentInput,
  PublishDeliveryFeeRuleInput,
  ReviewStoreSubmissionInput,
  SearchDeliveryAddressesInput,
  SetItemAvailabilityInput,
  SubmitMerchantStoreInput,
  UpdateCheckoutSettingsInput,
  UpsertItemInput,
  UpsertDeliveryZoneInput,
  UpsertStoreInput,
  VerifyPaystackPaymentInput,
} from "@spaceman/app-types";
import {
  QueryClient,
  useInfiniteQuery,
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
  checkoutSession: (checkoutSessionId: string) =>
    ["checkout-session", checkoutSessionId] as const,
  checkoutSettings: () => ["checkout-settings"] as const,
  deliveryZones: () => ["delivery-zones"] as const,
  feeRules: (deliveryZoneId: string) => ["fee-rules", deliveryZoneId] as const,
};

export function createSpacemanQueryClient(options?: {
  queryRetry?: boolean | number;
}): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        retry: options?.queryRetry ?? 1,
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

type CursorPageRequest = Omit<PageRequest, "cursor">;

export function useInfiniteActiveStores(
  service: MarketplaceService,
  request: CursorPageRequest = {},
) {
  return useInfiniteQuery({
    queryKey: [...queryKeys.stores(request), "infinite"],
    queryFn: ({ pageParam }) =>
      service.listActiveStores({
        ...request,
        ...(pageParam === undefined ? {} : { cursor: pageParam }),
      }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
  });
}

export function useInfiniteActiveItems(
  service: MarketplaceService,
  storeId: string | undefined,
  request: CursorPageRequest = {},
) {
  return useInfiniteQuery({
    queryKey: [...queryKeys.items(storeId ?? "none"), request, "infinite"],
    queryFn: ({ pageParam }) =>
      service.listActiveItems(storeId ?? "", {
        ...request,
        ...(pageParam === undefined ? {} : { cursor: pageParam }),
      }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
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

export function useSearchDeliveryAddresses(service: CheckoutService) {
  return useMutation({
    mutationFn: (input: SearchDeliveryAddressesInput) =>
      service.searchAddresses(input),
  });
}

export function useCreateCheckoutSession(service: CheckoutService) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateCheckoutSessionInput) =>
      service.createSession(input),
    onSuccess: (result) =>
      client.setQueryData(
        queryKeys.checkoutSession(result.checkoutSession.id),
        result.checkoutSession,
      ),
  });
}

export function useInitializePaystackPayment(service: CheckoutService) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: InitializePaystackPaymentInput) =>
      service.initializePayment(input),
    onSuccess: (result) =>
      client.invalidateQueries({
        queryKey: queryKeys.checkoutSession(result.checkoutSessionId),
      }),
  });
}

export function useVerifyPaystackPayment(service: CheckoutService) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: VerifyPaystackPaymentInput) =>
      service.verifyPayment(input),
    onSuccess: (result) => {
      void client.invalidateQueries({
        queryKey: queryKeys.checkoutSession(result.checkoutSessionId),
      });
      if (result.orderId)
        void Promise.all([
          client.invalidateQueries({ queryKey: ["order", result.orderId] }),
          client.invalidateQueries({ queryKey: ["customer-orders"] }),
        ]);
    },
  });
}

export function useCheckoutSession(
  service: CheckoutService,
  checkoutSessionId: string | undefined,
) {
  return useQuery({
    queryKey: queryKeys.checkoutSession(checkoutSessionId ?? "none"),
    queryFn: () => service.getSession(checkoutSessionId ?? ""),
    enabled: Boolean(checkoutSessionId),
    refetchOnWindowFocus: true,
  });
}

export function useCustomerOrders(
  service: CheckoutService,
  customerId: string | undefined,
  request?: PageRequest,
) {
  return useQuery({
    queryKey: [
      ...queryKeys.customerOrders(customerId ?? "none"),
      request ?? {},
    ],
    queryFn: () => service.listCustomerOrders(customerId ?? "", request),
    enabled: Boolean(customerId),
  });
}

export function useCheckoutConfiguration(service: CheckoutAdminService) {
  return useQuery({
    queryKey: queryKeys.checkoutSettings(),
    queryFn: () => service.getSettings(),
  });
}

export function useDeliveryZones(service: CheckoutAdminService) {
  return useQuery({
    queryKey: queryKeys.deliveryZones(),
    queryFn: () => service.listDeliveryZones({ limit: 50 }),
  });
}

export function useFeeRules(
  service: CheckoutAdminService,
  deliveryZoneId: string | undefined,
) {
  return useQuery({
    queryKey: queryKeys.feeRules(deliveryZoneId ?? "none"),
    queryFn: () => service.listFeeRules(deliveryZoneId ?? "", { limit: 50 }),
    enabled: Boolean(deliveryZoneId),
  });
}

export function useUpsertDeliveryZone(service: CheckoutAdminService) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: UpsertDeliveryZoneInput) =>
      service.upsertDeliveryZone(input),
    onSuccess: () =>
      client.invalidateQueries({ queryKey: queryKeys.deliveryZones() }),
  });
}

export function usePublishDeliveryFeeRule(service: CheckoutAdminService) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: PublishDeliveryFeeRuleInput) =>
      service.publishDeliveryFeeRule(input),
    onSuccess: (_result, input) => {
      void client.invalidateQueries({
        queryKey: queryKeys.feeRules(input.deliveryZoneId),
      });
      void client.invalidateQueries({ queryKey: queryKeys.deliveryZones() });
    },
  });
}

export function useUpdateCheckoutSettings(service: CheckoutAdminService) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateCheckoutSettingsInput) =>
      service.updateSettings(input),
    onSuccess: () =>
      client.invalidateQueries({ queryKey: queryKeys.checkoutSettings() }),
  });
}
