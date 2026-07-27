import { formatMoney } from "@spaceman/app-core";
import { isAppError } from "@spaceman/app-errors";
import {
  useCheckoutConfiguration,
  useDeliveryZones,
  useFeeRules,
  usePublishDeliveryFeeRule,
  useUpdateCheckoutSettings,
  useUpsertDeliveryZone,
} from "@spaceman/app-query";
import type { CheckoutAdminService } from "@spaceman/app-services";
import type { AppRole } from "@spaceman/app-core";
import { useEffect, useState, type FormEvent } from "react";

interface CheckoutSettingsPanelProps {
  service: CheckoutAdminService;
  role: AppRole;
}

function messageFor(error: unknown): string {
  return isAppError(error)
    ? error.userMessage
    : "Checkout configuration could not be saved.";
}

function amountMinor(data: FormData, name: string): number {
  const value = Number(data.get(name));
  if (!Number.isFinite(value) || value < 0)
    throw new Error(`${name} must be a non-negative amount.`);
  return Math.ceil(value * 100);
}

export function CheckoutSettingsPanel({
  service,
  role,
}: CheckoutSettingsPanelProps) {
  const settings = useCheckoutConfiguration(service);
  const zones = useDeliveryZones(service);
  const [zoneId, setZoneId] = useState("");
  const feeRules = useFeeRules(service, zoneId || undefined);
  const saveZone = useUpsertDeliveryZone(service);
  const publishRule = usePublishDeliveryFeeRule(service);
  const saveSettings = useUpdateCheckoutSettings(service);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [flags, setFlags] = useState({
    customerOrderingEnabled: false,
    mapsQuoteEnabled: false,
    paystackEnabled: false,
  });

  useEffect(() => {
    if (settings.data)
      setFlags({
        customerOrderingEnabled: settings.data.customerOrderingEnabled,
        mapsQuoteEnabled: settings.data.mapsQuoteEnabled,
        paystackEnabled: settings.data.paystackEnabled,
      });
  }, [settings.data]);

  const selectedZone = zones.data?.records.find((zone) => zone.id === zoneId);

  async function run(action: () => Promise<unknown>, success: string) {
    setError("");
    setNotice("");
    try {
      await action();
      setNotice(success);
    } catch (caught) {
      setError(messageFor(caught));
    }
  }

  async function submitZone(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const localities = String(data.get("allowedLocalities"))
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean);
    await run(async () => {
      const result = await saveZone.mutateAsync({
        ...(zoneId ? { deliveryZoneId: zoneId } : {}),
        name: String(data.get("name")),
        active: data.get("active") === "on",
        countryCode: "ZA",
        allowedLocalities: localities,
      });
      setZoneId(result.id);
    }, "Delivery zone saved.");
  }

  async function submitFeeRule(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!zoneId) {
      setError("Save or select a delivery zone first.");
      return;
    }
    const data = new FormData(event.currentTarget);
    const money = (name: string) => ({
      amountMinor: amountMinor(data, name),
      currency: "ZAR" as const,
    });
    const notes = String(data.get("notes")).trim();
    await run(
      () =>
        publishRule.mutateAsync({
          deliveryZoneId: zoneId,
          name: String(data.get("name")),
          deliveryType: "standard",
          baseFee: money("baseFee"),
          includedDistanceMetres: Number(data.get("includedDistanceMetres")),
          perKilometreFee: money("perKilometreFee"),
          smallOrderThreshold: money("smallOrderThreshold"),
          smallOrderSurcharge: money("smallOrderSurcharge"),
          minimumFee: money("minimumFee"),
          maximumFee: money("maximumFee"),
          effectiveFrom: new Date(
            String(data.get("effectiveFrom")),
          ).toISOString(),
          ...(notes ? { notes } : {}),
        }),
      "A new immutable fee-rule version was published.",
    );
  }

  return (
    <section className="account-panel" aria-label="Checkout configuration">
      <p className="eyebrow">Phase 4 configuration</p>
      <h2>Maps, checkout, and payment controls</h2>
      <p>
        These forms never display provider secrets. New payment initialization
        remains fail-closed until the zone, fee rule, and all three flags are
        configured.
      </p>
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
        <form onSubmit={(event) => void submitZone(event)}>
          <h3>Delivery zone</h3>
          <label>
            Existing zone
            <select
              value={zoneId}
              onChange={(event) => setZoneId(event.target.value)}
            >
              <option value="">Create a zone</option>
              {zones.data?.records.map((zone) => (
                <option key={zone.id} value={zone.id}>
                  {zone.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Zone name
            <input
              key={`${zoneId}-name`}
              name="name"
              defaultValue={selectedZone?.name ?? "Mabopane delivery"}
              required
            />
          </label>
          <label>
            Allowed ZA localities
            <input
              key={`${zoneId}-localities`}
              name="allowedLocalities"
              defaultValue={
                selectedZone?.allowedLocalities.join(", ") ?? "Mabopane"
              }
              required
            />
          </label>
          <label className="check-row">
            <input
              key={`${zoneId}-active`}
              name="active"
              type="checkbox"
              defaultChecked={selectedZone?.active ?? true}
            />
            Active
          </label>
          <button disabled={saveZone.isPending} type="submit">
            {saveZone.isPending ? "Saving…" : "Save delivery zone"}
          </button>
        </form>

        <form onSubmit={(event) => void submitFeeRule(event)}>
          <h3>Publish fee-rule version</h3>
          <p>Approved initial values are prefilled but are not auto-saved.</p>
          <label>
            Rule name
            <input name="name" defaultValue="Mabopane standard" required />
          </label>
          <label>
            Base fee (rand)
            <input
              name="baseFee"
              type="number"
              min="0"
              step="0.01"
              defaultValue="20.00"
            />
          </label>
          <label>
            Included distance (metres)
            <input
              name="includedDistanceMetres"
              type="number"
              min="0"
              step="1"
              defaultValue="3000"
            />
          </label>
          <label>
            Per kilometre (rand)
            <input
              name="perKilometreFee"
              type="number"
              min="0"
              step="0.01"
              defaultValue="4.00"
            />
          </label>
          <label>
            Small-order threshold (rand)
            <input
              name="smallOrderThreshold"
              type="number"
              min="0"
              step="0.01"
              defaultValue="100.00"
            />
          </label>
          <label>
            Small-order surcharge (rand)
            <input
              name="smallOrderSurcharge"
              type="number"
              min="0"
              step="0.01"
              defaultValue="10.00"
            />
          </label>
          <label>
            Minimum fee (rand)
            <input
              name="minimumFee"
              type="number"
              min="0"
              step="0.01"
              defaultValue="20.00"
            />
          </label>
          <label>
            Maximum fee (rand)
            <input
              name="maximumFee"
              type="number"
              min="0"
              step="0.01"
              defaultValue="80.00"
            />
          </label>
          <label>
            Effective from
            <input
              name="effectiveFrom"
              type="datetime-local"
              defaultValue={new Date().toISOString().slice(0, 16)}
              required
            />
          </label>
          <label>
            Notes
            <textarea name="notes" maxLength={500} />
          </label>
          <button disabled={!zoneId || publishRule.isPending} type="submit">
            {publishRule.isPending ? "Publishing…" : "Publish new version"}
          </button>
          {feeRules.data?.records.map((rule) => (
            <p key={rule.id}>
              v{rule.version} · {rule.name} ·{" "}
              {formatMoney(rule.baseFee.amountMinor)} base ·{" "}
              {rule.active ? "active" : "superseded"}
            </p>
          ))}
        </form>

        <form
          onSubmit={(event) => {
            event.preventDefault();
            void run(
              () => saveSettings.mutateAsync(flags),
              "Checkout enable flags updated.",
            );
          }}
        >
          <h3>Super-admin enable flags</h3>
          {(
            [
              ["customerOrderingEnabled", "Customer ordering"],
              ["mapsQuoteEnabled", "Maps delivery quotes"],
              ["paystackEnabled", "New Paystack payments"],
            ] as const
          ).map(([name, label]) => (
            <label className="check-row" key={name}>
              <input
                checked={flags[name]}
                disabled={role !== "super_admin"}
                type="checkbox"
                onChange={(event) =>
                  setFlags((current) => ({
                    ...current,
                    [name]: event.target.checked,
                  }))
                }
              />
              {label}
            </label>
          ))}
          <button
            disabled={role !== "super_admin" || saveSettings.isPending}
            type="submit"
          >
            {saveSettings.isPending ? "Saving…" : "Save enable flags"}
          </button>
          {role !== "super_admin" ? (
            <p>Only a super administrator can change enable flags.</p>
          ) : null}
        </form>
      </div>
    </section>
  );
}
