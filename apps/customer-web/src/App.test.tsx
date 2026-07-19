import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { App } from "./App";

describe("Customer App", () => {
  it("renders the marketplace foundation", () => {
    render(<App />);
    expect(screen.getByRole("heading", { name: "Marketplace foundation" })).toBeInTheDocument();
  });
});
