import { APP_ROLES } from "@spaceman/app-core";
import { spacemanTokens } from "@spaceman/app-ui";

const operationalAreas = ["Users and roles", "Stores and catalog", "Dispatch and orders", "Payments and audit"];

export function App() {
  return (
    <main className="shell">
      <p className="eyebrow">Spaceman Systems / admin-web</p>
      <h1>Operations foundation</h1>
      <p className="lead">
        This thin control plane is ready to consume trusted services once the shared development
        Firebase project is configured.
      </p>
      <section aria-label="Admin scope" className="grid">
        {operationalAreas.map((area) => (
          <article className="card" key={area}>
            <h2>{area}</h2>
            <p>Role-, scope-, and transition-guarded workflows will be connected through Functions.</p>
          </article>
        ))}
      </section>
      <footer>
        <span style={{ color: spacemanTokens.color.brand }}>Canonical roles:</span> {APP_ROLES.join(", ")}
      </footer>
    </main>
  );
}
