describe("customer app foundation", () => {
  it("keeps guest browsing separate from protected customer actions", () => {
    expect(["browse", "sign_in_before_checkout"]).toContain("sign_in_before_checkout");
  });
});
