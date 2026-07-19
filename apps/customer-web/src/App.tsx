import { formatMoney } from "@spaceman/app-core";
import { spacemanTokens } from "@spaceman/app-ui";

const customerJourneys = ["Browse active stores", "Build a single-store cart", "Validate a delivery quote", "Track paid orders"];

export function App() {
  return (
    <main className="shell">
      <p className="eyebrow">Spaceman Systems / customer-web</p>
      <h1>Marketplace foundation</h1>
      <p className="lead">
        Guest browsing comes first. Payment remains blocked until a trusted service validates the
        address, route, serviceability, and delivery fee.
      </p>
      <section aria-label="Customer journeys" className="grid">
        {customerJourneys.map((journey) => (
          <article className="card" key={journey}>
            <h2>{journey}</h2>
            <p>Shared contracts make the web and native customer experiences use the same data truth.</p>
          </article>
        ))}
      </section>
      <footer>
        <span style={{ color: spacemanTokens.color.brand }}>Money baseline:</span> {formatMoney(0)}; no
        payment order exists before verified provider confirmation.
      </footer>
    </main>
  );
}
