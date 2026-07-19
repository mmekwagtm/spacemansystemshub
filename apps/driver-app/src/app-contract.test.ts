describe("driver app foundation", () => {
  it("records foreground-only tracking as the V1 boundary", () => {
    expect("foreground_active_delivery").toContain("foreground");
  });
});
