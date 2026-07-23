import { formatMoney } from "@spaceman/app-core";
import { useActiveItems, useActiveStores } from "@spaceman/app-query";
import type { MarketplaceService } from "@spaceman/app-services";
import { useEffect, useMemo, useState } from "react";

interface MarketplacePanelProps {
  service: MarketplaceService;
}

export function MarketplacePanel({ service }: MarketplacePanelProps) {
  const [search, setSearch] = useState("");
  const [storeId, setStoreId] = useState<string>();
  const [category, setCategory] = useState("");
  const stores = useActiveStores(service, {
    limit: 50,
    ...(search ? { search } : {}),
  });
  const items = useActiveItems(service, storeId, {
    limit: 50,
    ...(category ? { category } : {}),
  });

  useEffect(() => {
    const first = stores.data?.records[0];
    if (first && !stores.data?.records.some((store) => store.id === storeId))
      setStoreId(first.id);
  }, [storeId, stores.data]);

  const categories = useMemo(
    () =>
      [
        ...new Set(items.data?.records.map((item) => item.categoryLabel) ?? []),
      ].sort(),
    [items.data],
  );
  const selectedStore = stores.data?.records.find(
    (store) => store.id === storeId,
  );
  const stale = stores.isFetching || items.isFetching;

  return (
    <section className="marketplace" aria-label="Active marketplace">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Public catalog</p>
          <h2>Browse active stores</h2>
        </div>
        <p className="catalog-state" role="status">
          {stale ? "Refreshing catalog…" : "Catalog cached and current"}
        </p>
      </div>
      <label className="search-field">
        Search stores
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Start typing a store name"
        />
      </label>
      {stores.isError ? (
        <p className="message error" role="alert">
          The catalog is temporarily unavailable. Cached results remain visible
          when available.
        </p>
      ) : null}
      {!stores.isLoading && stores.data?.records.length === 0 ? (
        <p>No active approved stores match this search.</p>
      ) : null}
      <div className="catalog-grid">
        {stores.data?.records.map((store) => (
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
          {items.isError ? (
            <p className="message error" role="alert">
              Menu refresh failed. Try again shortly.
            </p>
          ) : null}
          {!items.isLoading && items.data?.records.length === 0 ? (
            <p>No active menu items are available.</p>
          ) : null}
          <div className="catalog-grid">
            {items.data?.records.map((item) => (
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
        </section>
      ) : null}
    </section>
  );
}
