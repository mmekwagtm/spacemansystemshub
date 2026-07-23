import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import { normalizeCatalogPageRequest, normalizeCatalogSearch } from "./index";

describe("catalog pagination", () => {
  it("normalizes search text and clamps page size to the public maximum", () => {
    expect(normalizeCatalogSearch("  Fresh   FOOD ")).toBe("fresh food");
    expect(
      normalizeCatalogPageRequest({ limit: 500, search: "  Pizza " }),
    ).toEqual({
      limit: 50,
      search: "pizza",
    });
  });

  it("uses a safe default and never permits an empty page", () => {
    expect(normalizeCatalogPageRequest().limit).toBe(20);
    expect(normalizeCatalogPageRequest({ limit: 0 }).limit).toBe(1);
  });

  it("keeps every bounded marketplace query backed by an explicit index", () => {
    const indexFile = JSON.parse(
      readFileSync(
        resolve(process.cwd(), "../../firestore.indexes.json"),
        "utf8",
      ),
    ) as {
      indexes: Array<{
        collectionGroup: string;
        fields: Array<{ fieldPath: string }>;
      }>;
    };
    const signatures = new Set(
      indexFile.indexes.map(
        (index) =>
          `${index.collectionGroup}:${index.fields
            .map((field) => field.fieldPath)
            .join(",")}`,
      ),
    );
    expect(signatures.size).toBeGreaterThan(0);
    for (const signature of [
      "stores:status,approvalState,searchName,__name__",
      "stores:status,approvalState,category,searchName,__name__",
      "stores:merchantId,status,approvalState,__name__",
      "stores:merchantId,category,searchName,__name__",
      "items:storeId,status,searchName,__name__",
      "items:storeId,status,categoryLabel,searchName,__name__",
      "items:storeId,categoryLabel,searchName,__name__",
      "rows:valid,rowNumber,__name__",
    ]) {
      expect(signatures.has(signature), `missing ${signature}`).toBe(true);
    }
  });
});
