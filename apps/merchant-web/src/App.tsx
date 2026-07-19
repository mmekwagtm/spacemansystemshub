import { FULFILLMENT_STATUSES } from "@spaceman/app-core";
import { spacemanTokens } from "@spaceman/app-ui";

const merchantCapabilities = ["Store profile", "Catalog", "Paid order queue", "Preparation lifecycle"];

export function App() {
  return (
    <main className="shell">
      <p className="eyebrow">Spaceman Systems / merchant-web</p>
      <h1>Merchant operations foundation</h1>
      <p className="lead">
        Catalog changes and fulfillment transitions will use scope-checked trusted commands, never
        direct browser writes.
      </p>
      <section aria-label="Merchant capabilities" className="grid">
        {merchantCapabilities.map((capability) => (
          <article className="card" key={capability}>
            <h2>{capability}</h2>
            <p>Ready for the shared repository, query, and service layers.</p>
          </article>
        ))}
      </section>
      <footer>
        <span style={{ color: spacemanTokens.color.brand }}>Fulfillment contract:</span>{" "}
        {FULFILLMENT_STATUSES.join(" → ")}
      </footer>
    </main>
  );
}
