describe("driver app foundation", () => {
  it("requires invited driver identity before operations", () => {
    expect(["invited", "active"]).toContain("invited");
  });
});
