import {
  useInfiniteActiveItems,
  useInfiniteActiveStores,
} from "@spaceman/app-query";
import type { MarketplaceService } from "@spaceman/app-services";
import type { Item, Store } from "@spaceman/app-types";
import { useEffect, useMemo } from "react";

export const STORE_PAGE = { limit: 24 } as const;
export const MENU_PAGE = { limit: 50 } as const;

export const missingMarketplace = {
  listActiveStores: async () => ({ records: [] }),
  listActiveItems: async () => ({ records: [] }),
} as unknown as MarketplaceService;

/** Finds one public store from the shared cached store list, paging if needed. */
export function useActiveStore(
  service: MarketplaceService | undefined,
  storeId: string | undefined,
) {
  const stores = useInfiniteActiveStores(
    service ?? missingMarketplace,
    STORE_PAGE,
  );
  const records = useMemo(
    () => stores.data?.pages.flatMap((page) => page.records) ?? [],
    [stores.data],
  );
  const store: Store | undefined = records.find(
    (entry) => entry.id === storeId,
  );
  const { hasNextPage, isFetchingNextPage, fetchNextPage } = stores;
  useEffect(() => {
    if (storeId && !store && hasNextPage && !isFetchingNextPage)
      void fetchNextPage();
  }, [fetchNextPage, hasNextPage, isFetchingNextPage, store, storeId]);
  return {
    store,
    loading:
      stores.isLoading || (!store && (hasNextPage || isFetchingNextPage)),
    error: stores.isError && !store,
    retry: () => void stores.refetch(),
  };
}

/** Loads a store's whole public menu (small kitchen menus fit in a few pages). */
export function useStoreMenu(
  service: MarketplaceService | undefined,
  storeId: string | undefined,
) {
  const items = useInfiniteActiveItems(
    service ?? missingMarketplace,
    storeId,
    MENU_PAGE,
  );
  const records: Item[] = useMemo(
    () => items.data?.pages.flatMap((page) => page.records) ?? [],
    [items.data],
  );
  const { hasNextPage, isFetchingNextPage, fetchNextPage } = items;
  useEffect(() => {
    if (hasNextPage && !isFetchingNextPage) void fetchNextPage();
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);
  return {
    items: records,
    loading: items.isLoading,
    error: items.isError || items.isRefetchError,
    retry: () => void items.refetch(),
  };
}
