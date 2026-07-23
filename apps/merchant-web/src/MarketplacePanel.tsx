import { formatMoney } from "@spaceman/app-core";
import { isAppError } from "@spaceman/app-errors";
import { prepareCatalogMediaFile } from "@spaceman/app-firebase";
import {
  useManagedItems,
  useMerchantStores,
  usePendingMerchantStores,
} from "@spaceman/app-query";
import type { MarketplaceService } from "@spaceman/app-services";
import type { SubmitMerchantStoreInput } from "@spaceman/app-types";
import { useEffect, useState, type FormEvent } from "react";

interface MarketplacePanelProps {
  merchantId: string;
  ownerId: string;
  service: MarketplaceService;
  submissionOnly?: boolean;
}

function messageFor(error: unknown): string {
  return isAppError(error)
    ? error.userMessage
    : "The merchant marketplace request failed.";
}

export function MarketplacePanel({
  merchantId,
  ownerId,
  service,
  submissionOnly = false,
}: MarketplacePanelProps) {
  const assignedStores = useMerchantStores(
    service,
    merchantId,
    { limit: 50 },
    !submissionOnly,
  );
  const pendingStores = usePendingMerchantStores(
    service,
    merchantId,
    { limit: 50 },
    submissionOnly,
  );
  const stores = submissionOnly ? pendingStores : assignedStores;
  const [storeId, setStoreId] = useState<string>();
  const items = useManagedItems(service, storeId, { limit: 50 });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    if (storeId === undefined && stores.data?.records[0])
      setStoreId(stores.data.records[0].id);
  }, [storeId, stores.data]);

  async function run(action: () => Promise<unknown>, message: string) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await action();
      setNotice(message);
      await Promise.all([stores.refetch(), items.refetch()]);
    } catch (caught) {
      setError(messageFor(caught));
    } finally {
      setBusy(false);
    }
  }

  async function submitStore(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    await run(async () => {
      const storeInput: SubmitMerchantStoreInput = {
        name: String(data.get("name")),
        category: String(data.get("category")),
        description: String(data.get("description")),
        address: {
          label: String(data.get("name")),
          formattedAddress: String(data.get("address")),
          coordinates: {
            latitude: Number(data.get("latitude")),
            longitude: Number(data.get("longitude")),
          },
        },
        openingHours: [],
        minimumOrder: {
          amountMinor: Number(data.get("minimumOrder")),
          currency: "ZAR",
        },
      };
      const result = await service.submitMerchantStore(storeInput);
      setStoreId(result.id);
      const file = data.get("cardImage");
      if (file instanceof File && file.size > 0) {
        const media = await service.stageMedia({
          storeId: result.id,
          ownerId,
          assetId: crypto.randomUUID(),
          altText: String(data.get("cardImageAlt")),
          ...(await prepareCatalogMediaFile(file)),
        });
        try {
          await service.submitMerchantStore({
            ...storeInput,
            storeId: result.id,
            cardMedia: media,
          });
        } catch (error) {
          await service.cleanupMedia({
            storeId: result.id,
            sourcePath: media.sourcePath,
            thumbnailPath: media.thumbnailPath,
          });
          throw error;
        }
      }
    }, "Draft submitted for administrator review.");
  }

  async function updateStore(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!storeId) return;
    const data = new FormData(event.currentTarget);
    await run(async () => {
      const file = data.get("cardImage");
      const media =
        file instanceof File && file.size > 0
          ? await service.stageMedia({
              storeId,
              ownerId,
              assetId: crypto.randomUUID(),
              altText: String(data.get("cardImageAlt")),
              ...(await prepareCatalogMediaFile(file)),
            })
          : undefined;
      try {
        await service.updateMerchantStore({
          storeId,
          name: String(data.get("name")),
          category: String(data.get("category")),
          description: String(data.get("description")),
          openingHours: [],
          openForOrders: data.get("openForOrders") === "on",
          minimumOrder: {
            amountMinor: Number(data.get("minimumOrder")),
            currency: "ZAR",
          },
          ...(media ? { cardMedia: media } : {}),
        });
      } catch (error) {
        if (media) {
          await service.cleanupMedia({
            storeId,
            sourcePath: media.sourcePath,
            thumbnailPath: media.thumbnailPath,
          });
        }
        throw error;
      }
    }, "Store presentation and operating state updated.");
  }

  async function createItem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!storeId) return;
    const data = new FormData(event.currentTarget);
    await run(async () => {
      const file = data.get("itemImage");
      const media =
        file instanceof File && file.size > 0
          ? await service.stageMedia({
              storeId,
              ownerId,
              assetId: crypto.randomUUID(),
              altText: String(data.get("imageAlt")),
              ...(await prepareCatalogMediaFile(file)),
            })
          : undefined;
      try {
        await service.saveItem({
          storeId,
          name: String(data.get("name")),
          description: String(data.get("description")),
          status: "active",
          available: true,
          price: { amountMinor: Number(data.get("price")), currency: "ZAR" },
          categoryLabel: String(data.get("category")),
          sortOrder: Number(data.get("sortOrder")),
          source: "merchant",
          imageAlt: String(data.get("imageAlt")),
          ...(media ? { media } : {}),
        });
      } catch (error) {
        if (media) {
          await service.cleanupMedia({
            storeId,
            sourcePath: media.sourcePath,
            thumbnailPath: media.thumbnailPath,
          });
        }
        throw error;
      }
    }, "Assigned-store item saved.");
  }

  const activeStore = stores.data?.records.find(
    (store) => store.id === storeId,
  );
  return (
    <section className="marketplace" aria-label="Merchant marketplace">
      <p className="eyebrow">Phase 3</p>
      <h2>{submissionOnly ? "Store submission" : "Assigned marketplace"}</h2>
      {error ? (
        <p className="message error" role="alert">
          {error}
        </p>
      ) : null}
      {notice ? (
        <p className="message success" role="status">
          {notice}
        </p>
      ) : null}
      <div className="forms">
        <form onSubmit={(event) => void submitStore(event)}>
          <h3>Submit draft store</h3>
          <label>
            Name
            <input name="name" required />
          </label>
          <label>
            Category
            <input name="category" defaultValue="Restaurant" required />
          </label>
          <label>
            Description
            <textarea name="description" maxLength={2000} />
          </label>
          <label>
            Address
            <input name="address" required />
          </label>
          <label>
            Latitude
            <input
              name="latitude"
              type="number"
              step="any"
              defaultValue="-25.5407"
              required
            />
          </label>
          <label>
            Longitude
            <input
              name="longitude"
              type="number"
              step="any"
              defaultValue="28.1007"
              required
            />
          </label>
          <label>
            Minimum order (cents)
            <input
              name="minimumOrder"
              type="number"
              min="0"
              defaultValue="0"
              required
            />
          </label>
          <label>
            Store card image
            <input
              name="cardImage"
              type="file"
              accept="image/jpeg,image/png,image/webp"
            />
          </label>
          <label>
            Store image alt text
            <input name="cardImageAlt" defaultValue="Store card image" />
          </label>
          <button disabled={busy} type="submit">
            Submit for review
          </button>
        </form>

        {!submissionOnly && activeStore ? (
          <form onSubmit={(event) => void updateStore(event)}>
            <h3>Update assigned store</h3>
            <label>
              Store
              <select
                value={storeId}
                onChange={(event) => setStoreId(event.target.value)}
              >
                {stores.data?.records.map((store) => (
                  <option key={store.id} value={store.id}>
                    {store.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Name
              <input name="name" defaultValue={activeStore.name} required />
            </label>
            <label>
              Category
              <input
                name="category"
                defaultValue={activeStore.category}
                required
              />
            </label>
            <label>
              Description
              <textarea
                name="description"
                defaultValue={activeStore.description}
              />
            </label>
            <label>
              Minimum order (cents)
              <input
                name="minimumOrder"
                type="number"
                min="0"
                defaultValue={activeStore.minimumOrder.amountMinor}
                required
              />
            </label>
            <label className="check-row">
              <input
                name="openForOrders"
                type="checkbox"
                defaultChecked={activeStore.openForOrders}
              />{" "}
              Open for orders
            </label>
            <label>
              Replacement card image
              <input
                name="cardImage"
                type="file"
                accept="image/jpeg,image/png,image/webp"
              />
            </label>
            <label>
              Store image alt text
              <input
                name="cardImageAlt"
                defaultValue={
                  activeStore.cardMedia?.altText ?? activeStore.name
                }
              />
            </label>
            <button disabled={busy} type="submit">
              Save store settings
            </button>
          </form>
        ) : null}

        {!submissionOnly && activeStore ? (
          <form onSubmit={(event) => void createItem(event)}>
            <h3>Add catalog item</h3>
            <label>
              Name
              <input name="name" required />
            </label>
            <label>
              Description
              <textarea name="description" />
            </label>
            <label>
              Price (cents)
              <input name="price" type="number" min="0" required />
            </label>
            <label>
              Category
              <input name="category" defaultValue="Meals" required />
            </label>
            <label>
              Sort order
              <input name="sortOrder" type="number" min="0" defaultValue="0" />
            </label>
            <label>
              Image alt text
              <input name="imageAlt" required />
            </label>
            <label>
              Item image
              <input
                name="itemImage"
                type="file"
                accept="image/jpeg,image/png,image/webp"
              />
            </label>
            <button disabled={busy} type="submit">
              Save item
            </button>
          </form>
        ) : null}
      </div>

      <div className="catalog-grid">
        {stores.data?.records.map((store) => (
          <article
            className={`card ${store.id === storeId ? "selected" : ""}`}
            key={store.id}
          >
            <p className="eyebrow">
              {store.approvalState} · {store.status}
            </p>
            <h3>{store.name}</h3>
            <p>
              {store.category} · Minimum{" "}
              {formatMoney(store.minimumOrder.amountMinor)}
            </p>
            <button
              className="secondary"
              type="button"
              onClick={() => setStoreId(store.id)}
            >
              Select store
            </button>
          </article>
        ))}
      </div>

      {!submissionOnly ? (
        <div className="catalog-grid">
          {items.data?.records.map((item) => (
            <article className="card" key={item.id}>
              <p className="eyebrow">{item.categoryLabel}</p>
              <h3>{item.name}</h3>
              <p>
                {formatMoney(item.price.amountMinor)} ·{" "}
                {item.available ? "Available" : "Unavailable"}
              </p>
              <button
                className="secondary"
                disabled={busy}
                type="button"
                onClick={() =>
                  void run(
                    () =>
                      service.setItemAvailability({
                        itemId: item.id,
                        available: !item.available,
                      }),
                    `Item marked ${item.available ? "unavailable" : "available"}.`,
                  )
                }
              >
                Mark {item.available ? "unavailable" : "available"}
              </button>
            </article>
          ))}
        </div>
      ) : null}
    </section>
  );
}
