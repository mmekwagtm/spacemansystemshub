import { formatMoney } from "@spaceman/app-core";
import { isAppError } from "@spaceman/app-errors";
import {
  useAdminStores,
  useImportRows,
  useManagedItems,
} from "@spaceman/app-query";
import {
  prepareCatalogMediaFile,
  type MarketplaceService,
} from "@spaceman/app-services";
import type {
  OpeningHoursPeriod,
  StorePlaceCandidate,
  UpsertStoreInput,
} from "@spaceman/app-types";
import { useEffect, useState, type FormEvent } from "react";

interface MarketplacePanelProps {
  ownerId: string;
  service: MarketplaceService;
}

function errorMessage(error: unknown): string {
  return isAppError(error)
    ? error.userMessage
    : "The marketplace request could not be completed.";
}

function values(data: FormData, name: string): string[] {
  return String(data.get(name) ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
}

function openingHoursFrom(data: FormData): OpeningHoursPeriod[] {
  const opensAt = String(data.get("opensAt"));
  const closesAt = String(data.get("closesAt"));
  return Array.from({ length: 7 }, (_, day) => ({
    day: day as OpeningHoursPeriod["day"],
    closed: false,
    opensAt,
    closesAt,
  }));
}

function OpeningHoursFields() {
  return (
    <fieldset>
      <legend>Daily opening hours</legend>
      <label>
        Opens
        <input defaultValue="08:00" name="opensAt" required type="time" />
      </label>
      <label>
        Closes
        <input defaultValue="20:00" name="closesAt" required type="time" />
      </label>
    </fieldset>
  );
}

export function MarketplacePanel({ ownerId, service }: MarketplacePanelProps) {
  const [storeSearch, setStoreSearch] = useState("");
  const stores = useAdminStores(service, {
    limit: 50,
    ...(storeSearch ? { search: storeSearch } : {}),
  });
  const [storeId, setStoreId] = useState<string>();
  const [createdStoreOption, setCreatedStoreOption] = useState<{
    id: string;
    name: string;
  }>();
  const items = useManagedItems(service, storeId, { limit: 50 });
  const [batchId, setBatchId] = useState<string>();
  const importRows = useImportRows(service, batchId);
  const [selectedRows, setSelectedRows] = useState<string[]>([]);
  const [places, setPlaces] = useState<StorePlaceCandidate[]>([]);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (storeId === undefined && stores.data?.records[0])
      setStoreId(stores.data.records[0].id);
  }, [storeId, stores.data]);

  useEffect(() => {
    setSelectedRows(
      importRows.data?.records
        .filter((row) => row.valid)
        .map((row) => row.id) ?? [],
    );
  }, [importRows.data]);

  async function run(action: () => Promise<unknown>, message: string) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await action();
      setNotice(message);
      await Promise.all([stores.refetch(), items.refetch()]);
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setBusy(false);
    }
  }

  async function createStore(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    await run(async () => {
      const requestedStoreId = crypto.randomUUID();
      const storeInput: UpsertStoreInput = {
        storeId: requestedStoreId,
        merchantId: String(data.get("merchantId")),
        name: String(data.get("name")),
        category: String(data.get("category")),
        description: String(data.get("description")),
        status: String(data.get("status")) as "draft" | "active",
        deliveryZoneIds: values(data, "deliveryZoneIds"),
        address: {
          label: String(data.get("name")),
          formattedAddress: String(data.get("address")),
          coordinates: {
            latitude: Number(data.get("latitude")),
            longitude: Number(data.get("longitude")),
          },
        },
        openingHours: openingHoursFrom(data),
        openForOrders: data.get("status") === "active",
        minimumOrder: {
          amountMinor: Number(data.get("minimumOrder")),
          currency: "ZAR",
        },
      };
      const file = data.get("cardImage");
      const media =
        file instanceof File && file.size > 0
          ? await service.stageMedia({
              storeId: requestedStoreId,
              ownerId,
              assetId: crypto.randomUUID(),
              altText: String(data.get("cardImageAlt")),
              ...(await prepareCatalogMediaFile(file)),
            })
          : undefined;
      try {
        const result = await service.saveAdminStore({
          ...storeInput,
          ...(media ? { cardMedia: media } : {}),
        });
        setStoreId(result.id);
        setCreatedStoreOption({ id: result.id, name: storeInput.name });
      } catch (error) {
        if (media) {
          await service.cleanupMedia({
            storeId: requestedStoreId,
            sourcePath: media.sourcePath,
            thumbnailPath: media.thumbnailPath,
          });
        }
        throw error;
      }
      form.reset();
    }, "Store saved through the trusted marketplace command.");
  }

  async function createItem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!storeId) return;
    const form = event.currentTarget;
    const data = new FormData(form);
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
          source: "manual",
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
      form.reset();
    }, "Catalog item published.");
  }

  async function stageCsv(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!storeId) return;
    const data = new FormData(event.currentTarget);
    await run(async () => {
      const result = await service.stageCsvImport({
        storeId,
        csv: String(data.get("csv")),
      });
      setBatchId(result.id);
    }, "CSV normalized. Review and select rows before commit.");
  }

  async function searchPlaces(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    await run(
      async () =>
        setPlaces(
          await service.searchPlaces({ query: String(data.get("query")) }),
        ),
      "Place search completed.",
    );
  }

  return (
    <section className="marketplace" aria-label="Marketplace operations">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Phase 3</p>
          <h2>Marketplace operations</h2>
        </div>
        <button
          className="secondary"
          type="button"
          onClick={() => void stores.refetch()}
        >
          Refresh catalog
        </button>
      </div>
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
      <label className="search-field">
        Search managed stores
        <input
          onChange={(event) => setStoreSearch(event.target.value)}
          placeholder="Start typing a store name"
          value={storeSearch}
        />
      </label>

      <div className="forms">
        <form onSubmit={(event) => void createStore(event)}>
          <h3>Create or publish store</h3>
          <label>
            Merchant user ID
            <input name="merchantId" required />
          </label>
          <label>
            Store name
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
            Delivery zone IDs
            <input
              name="deliveryZoneIds"
              placeholder="zone-mabopane"
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
          <OpeningHoursFields />
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
          <label>
            Status
            <select name="status">
              <option value="draft">Draft</option>
              <option value="active">Active</option>
            </select>
          </label>
          <button disabled={busy} type="submit">
            Save store
          </button>
        </form>

        <form onSubmit={(event) => void createItem(event)}>
          <h3>Publish catalog item</h3>
          <label>
            Target store
            <select
              value={storeId ?? ""}
              onChange={(event) => setStoreId(event.target.value)}
              required
            >
              <option value="">Select a store</option>
              {createdStoreOption &&
              !stores.data?.records.some(
                (store) => store.id === createdStoreOption.id,
              ) ? (
                <option value={createdStoreOption.id}>
                  {createdStoreOption.name}
                </option>
              ) : null}
              {stores.data?.records.map((store) => (
                <option key={store.id} value={store.id}>
                  {store.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Item name
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
            <input
              name="sortOrder"
              type="number"
              min="0"
              defaultValue="0"
              required
            />
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
          <button disabled={busy || !storeId} type="submit">
            Publish item
          </button>
        </form>
      </div>

      <div className="catalog-grid">
        {stores.isLoading ? <p role="status">Loading stores…</p> : null}
        {stores.data?.records.map((store) => (
          <article
            className={`card ${storeId === store.id ? "selected" : ""}`}
            key={store.id}
          >
            <p className="eyebrow">
              {store.approvalState} · {store.status}
            </p>
            <h3>{store.name}</h3>
            <p>
              {store.category} · Minimum{" "}
              {formatMoney(store.minimumOrder?.amountMinor ?? 0)}
            </p>
            <button
              className="secondary"
              type="button"
              onClick={() => setStoreId(store.id)}
            >
              Manage catalog
            </button>
            {store.approvalState === "pending" ? (
              <div className="actions">
                <button
                  disabled={busy}
                  type="button"
                  onClick={() =>
                    void run(
                      () =>
                        service.reviewStore({
                          storeId: store.id,
                          decision: "approve",
                          deliveryZoneIds: store.deliveryZoneIds.length
                            ? store.deliveryZoneIds
                            : ["zone-development"],
                        }),
                      "Store approved; merchant scope refresh is required.",
                    )
                  }
                >
                  Approve
                </button>
                <button
                  className="danger"
                  disabled={busy}
                  type="button"
                  onClick={() =>
                    void run(
                      () =>
                        service.reviewStore({
                          storeId: store.id,
                          decision: "reject",
                          reason: "Development review rejection",
                        }),
                      "Store submission rejected.",
                    )
                  }
                >
                  Reject
                </button>
              </div>
            ) : null}
          </article>
        ))}
      </div>

      {storeId ? (
        <section className="subpanel">
          <h3>Managed items</h3>
          <div className="catalog-grid">
            {items.data?.records.map((item) => (
              <article className="card" key={item.id}>
                <p className="eyebrow">{item.categoryLabel}</p>
                <h4>{item.name}</h4>
                <p>
                  {formatMoney(item.price.amountMinor)} ·{" "}
                  {item.available ? "Available" : "Unavailable"}
                </p>
                <button
                  className="danger"
                  disabled={busy}
                  type="button"
                  onClick={() =>
                    void run(
                      () => service.retireItem({ itemId: item.id }),
                      "Item retired.",
                    )
                  }
                >
                  Retire item
                </button>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      <div className="forms">
        <form onSubmit={(event) => void searchPlaces(event)}>
          <h3>Google Places store staging</h3>
          <label>
            Search query
            <input
              name="query"
              placeholder="restaurants in Mabopane"
              required
            />
          </label>
          <button disabled={busy} type="submit">
            Search places
          </button>
          {places.map((place) => (
            <button
              className="secondary"
              key={place.placeId}
              type="button"
              onClick={() =>
                void run(async () => {
                  const merchantId = window.prompt(
                    "Merchant user ID for this staged store",
                  );
                  if (!merchantId) return;
                  const result = await service.stageGoogleImport({
                    placeId: place.placeId,
                    merchantId,
                  });
                  setBatchId(result.id);
                }, "Google store staged for review.")
              }
            >
              {place.name} — {place.formattedAddress}
            </button>
          ))}
        </form>
        <form onSubmit={(event) => void stageCsv(event)}>
          <h3>CSV catalog import</h3>
          <label>
            CSV preview
            <textarea
              name="csv"
              rows={9}
              defaultValue={
                "name,description,price_minor,category,available,image_alt,external_id\nDevelopment Burger,Test fixture,8500,Meals,true,Burger on a plate,dev-burger"
              }
              required
            />
          </label>
          <button disabled={busy || !storeId} type="submit">
            Stage CSV
          </button>
        </form>
      </div>

      {batchId ? (
        <section className="subpanel" aria-label="Import preview">
          <h3>Import preview</h3>
          <p>
            Batch: <code>{batchId}</code>
          </p>
          {importRows.data?.records.map((row) => (
            <label className="check-row" key={row.id}>
              <input
                type="checkbox"
                checked={selectedRows.includes(row.id)}
                disabled={!row.valid}
                onChange={(event) =>
                  setSelectedRows((current) =>
                    event.target.checked
                      ? [...current, row.id]
                      : current.filter((id) => id !== row.id),
                  )
                }
              />
              Row {row.rowNumber}:{" "}
              {row.valid ? row.normalized.name : row.errors.join(", ")}
              {row.duplicateOf ? " (updates duplicate)" : ""}
            </label>
          ))}
          <div className="actions">
            <button
              disabled={busy || selectedRows.length === 0}
              type="button"
              onClick={() =>
                void run(
                  () =>
                    service.commitImport({
                      batchId,
                      selectedRowIds: selectedRows,
                    }),
                  "Selected import rows committed idempotently.",
                )
              }
            >
              Commit selected rows
            </button>
            <button
              className="secondary"
              disabled={busy}
              type="button"
              onClick={() =>
                void run(
                  () => service.cancelImport({ batchId }),
                  "Import cancelled.",
                )
              }
            >
              Cancel import
            </button>
          </div>
        </section>
      ) : null}
    </section>
  );
}
