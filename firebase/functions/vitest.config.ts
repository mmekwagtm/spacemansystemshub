import { fileURLToPath, URL } from "node:url";

import { defineConfig } from "vitest/config";

const workspacePackage = (name: string) =>
  fileURLToPath(
    new URL(`../../packages/${name}/src/index.ts`, import.meta.url),
  );

export default defineConfig({
  resolve: {
    alias: {
      "@spaceman/app-core": workspacePackage("app-core"),
      "@spaceman/app-errors": workspacePackage("app-errors"),
      "@spaceman/app-functions": workspacePackage("app-functions"),
      "@spaceman/app-maps": workspacePackage("app-maps"),
      "@spaceman/app-types": workspacePackage("app-types"),
      "@spaceman/app-validation": workspacePackage("app-validation"),
    },
  },
});
