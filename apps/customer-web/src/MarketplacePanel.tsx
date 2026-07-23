import { formatMoney } from "@spaceman/app-core";
import {
  useInfiniteActiveItems,
  useInfiniteActiveStores,
} from "@spaceman/app-query";
import type { MarketplaceService } from "@spaceman/app-services";
import { useEffect, useMemo, useState } from "react";

interface MarketplacePanelProps {
  service: MarketplaceService;
}

export function MarketplacePanel({ service }: MarketplacePanelProps) {
  const [search, setSearch] = useState("");
  const [storeId, setStoreId] = useState<string>();
  const [category, setCategory] = useState("");
  const stores = useInfiniteActiveStores(service, {
    limit: 12,
    ...(search ? { search } : {}),
  });
  const items = useInfiniteActiveItems(service, storeId, {
    limit: 12,
    ...(category ? { category } : {}),
  });
  const storeRecords = useMemo(
    () => stores.data?.pages.flatMap((page) => page.records) ?? [],
    [stores.data],
  );
  const itemRecords = useMemo(
    () => items.data?.pages.flatMap((page) => page.records) ?? [],
    [items.data],
  );

  useEffect(() => {
    const first = storeRecords[0];
    if (first && !storeRecords.some((store) => store.id === storeId))
      setStoreId(first.id);
  }, [storeId, storeRecords]);

  const categories = useMemo(
    () =>
      [...new Set(itemRecords.map((item) => item.categoryLabel))].sort(),
    [itemRecords],
  );
  const selectedStore = storeRecords.find(
    (store) => store.id === storeId,
  );
  const catalogFailed =
    stores.isError ||
    stores.isRefetchError ||
    items.isError ||
    items.isRefetchError;
  const catalogHasData = storeRecords.length > 0 || itemRecords.length > 0;
  const catalogState = catalogFailed
    ? catalogHasData
      ? "Cached catalog — refresh failed"
      : "Catalog unavailable"
    : stores.isFetching || items.isFetching
      ? "Refreshing catalog…"
      : "Catalog cached and current";

  return (
    <section className="marketplace" aria-label="Active marketplace">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Public catalog</p>
          <h2>Browse active stores</h2>
        </div>
        <div>
          <p className="catalog-state" role="status">
            {catalogState}
          </p>
          <button
            className="secondary"
            disabled={stores.isFetching || items.isFetching}
            type="button"
            onClick={() =>
              void Promise.all([
                stores.refetch(),
                ...(storeId ? [items.refetch()] : []),
              ])
            }
          >
            Refresh catalog
          </button>
        </div>
      </div>
      <label className="search-field">
        Search stores
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Start typing a store name"
        />
      </label>
      {stores.isError || stores.isRefetchError ? (
        <p className="message error" role="alert">
          The catalog is temporarily unavailable. Cached results remain visible
          when available.
        </p>
      ) : null}
      {!stores.isLoading && storeRecords.length === 0 ? (
        <p>No active approved stores match this search.</p>
      ) : null}
      <div className="catalog-grid">
        {storeRecords.map((store) => (
          <article
            className={`store-card ${store.id === storeId ? "selected" : ""}`}
            key={store.id}
          >
            {store.cardMedia?.thumbnailUrl || store.imageUrl ? (
              <img
                alt={store.cardMedia?.altText ?? store.name}
                loading="lazy"
                src={store.cardMedia?.thumbnailUrl ?? store.imageUrl}
              />
            ) : (
              <div className="image-placeholder" aria-hidden="true">
                {store.name.slice(0, 1)}
              </div>
            )}
            <div>
              <p className="eyebrow">{store.category}</p>
              <h3>{store.name}</h3>
              <p>{store.description || "Marketplace store"}</p>
              <p>
                Minimum {formatMoney(store.minimumOrder.amountMinor)} ·{" "}
                {store.openForOrders ? "Open for orders" : "Browsing only"}
              </p>
            </div>
            <button
              className="secondary"
              type="button"
              onClick={() => {
                setStoreId(store.id);
                setCategory("");
              }}
            >
              View menu
            </button>
          </article>
        ))}
      </div>
      {stores.hasNextPage ? (
        <button
          className="secondary"
          disabled={stores.isFetchingNextPage}
          type="button"
          onClick={() => void stores.fetchNextPage()}
        >
          {stores.isFetchingNextPage ? "Loading stores…" : "Load more stores"}
        </button>
      ) : null}

      {selectedStore ? (
        <section className="subpanel" aria-label={`${selectedStore.name} menu`}>
          <div className="section-heading">
            <div>
              <p className="eyebrow">Active menu</p>
              <h2>{selectedStore.name}</h2>
            </div>
            <label>
              Category
              <select
                value={category}
                onChange={(event) => setCategory(event.target.value)}
              >
                <option value="">All categories</option>
                {categories.map((value) => (
                  <option key={value}>{value}</option>
                ))}
              </select>
            </label>
          </div>
          {items.isError || items.isRefetchError ? (
            <p className="message error" role="alert">
              Menu refresh failed. Try again shortly.
            </p>
          ) : null}
          {!items.isLoading && itemRecords.length === 0 ? (
            <p>No active menu items are available.</p>
          ) : null}
          <div className="catalog-grid">
            {itemRecords.map((item) => (
              <article
                className={`item-card ${item.available ? "" : "unavailable"}`}
                key={item.id}
              >
                {item.media?.thumbnailUrl || item.imageUrl ? (
                  <img
                    alt={item.imageAlt || item.name}
                    loading="lazy"
                    src={item.media?.thumbnailUrl ?? item.imageUrl}
                  />
                ) : (
                  <div className="image-placeholder" aria-hidden="true">
                    {item.name.slice(0, 1)}
                  </div>
                )}
                <p className="eyebrow">{item.categoryLabel}</p>
                <h3>{item.name}</h3>
                <p>{item.description}</p>
                <strong>{formatMoney(item.price.amountMinor)}</strong>
                <span>
                  {item.available ? "Available" : "Temporarily unavailable"}
                </span>
              </article>
            ))}
          </div>
          {items.hasNextPage ? (
            <button
              className="secondary"
              disabled={items.isFetchingNextPage}
              type="button"
              onClick={() => void items.fetchNextPage()}
            >
              {items.isFetchingNextPage
                ? "Loading menu…"
                : "Load more menu items"}
            </button>
          ) : null}
        </section>
      ) : null}
    </section>
  );
}
