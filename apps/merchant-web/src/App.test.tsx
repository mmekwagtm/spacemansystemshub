import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { App } from "./App";

describe("Merchant App", () => {
  it("renders the merchant operations foundation", () => {
    render(<App />);
    expect(screen.getByRole("heading", { name: "Merchant operations foundation" })).toBeInTheDocument();
  });
});
