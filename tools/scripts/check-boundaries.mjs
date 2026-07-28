import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, relative, resolve } from "node:path";

const root = resolve(import.meta.dirname, "../..");
const appsRoot = resolve(root, "apps");
const packagesRoot = resolve(root, "packages");
const sourcePattern = /\.[cm]?[jt]sx?$/;
const appNames = readdirSync(appsRoot, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name);
const appPackages = new Map(
  appNames.map((appName) => {
    const manifest = JSON.parse(
      readFileSync(resolve(appsRoot, appName, "package.json"), "utf8"),
    );
    return [manifest.name, appName];
  }),
);

function collectFiles(directory) {
  if (!existsSync(directory)) return [];
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) return collectFiles(path);
    return sourcePattern.test(entry.name) ? [path] : [];
  });
}

function importSpecifiers(source) {
  const patterns = [
    /\bfrom\s*["']([^"']+)["']/g,
    /\bimport\s*\(\s*["']([^"']+)["']\s*\)/g,
    /\brequire\s*\(\s*["']([^"']+)["']\s*\)/g,
    /\bimport\s*["']([^"']+)["']/g,
  ];
  return patterns.flatMap((pattern) =>
    [...source.matchAll(pattern)].map((match) => ({
      index: match.index ?? 0,
      specifier: match[1],
    })),
  );
}

function appForSpecifier(specifier, sourceFile) {
  for (const [packageName, appName] of appPackages) {
    if (specifier === packageName || specifier.startsWith(`${packageName}/`)) {
      return appName;
    }
  }
  const target = specifier.startsWith(".")
    ? resolve(dirname(sourceFile), specifier)
    : specifier.startsWith("apps/")
      ? resolve(root, specifier)
      : null;
  if (!target) return null;
  const parts = relative(root, target).split("/");
  return parts[0] === "apps" && appNames.includes(parts[1]) ? parts[1] : null;
}

function isFirebaseAdapter(sourceFile, appName) {
  const appRelative = relative(resolve(appsRoot, appName), sourceFile);
  return (
    /^src\/identity\.[cm]?[jt]sx?$/.test(appRelative) ||
    /^(?:src|app)\/(?:platform|adapters)\//.test(appRelative)
  );
}

const files = [
  ...appNames.flatMap((appName) => [
    ...collectFiles(resolve(appsRoot, appName, "src")),
    ...collectFiles(resolve(appsRoot, appName, "app")),
  ]),
  ...readdirSync(packagesRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .flatMap((entry) => collectFiles(resolve(packagesRoot, entry.name, "src"))),
];
const failures = [];

for (const sourceFile of files) {
  const source = readFileSync(sourceFile, "utf8");
  const parts = relative(root, sourceFile).split("/");
  const sourceApp = parts[0] === "apps" ? parts[1] : null;
  const sourcePackage = parts[0] === "packages" ? parts[1] : null;

  for (const { index, specifier } of importSpecifiers(source)) {
    const line = source.slice(0, index).split("\n").length;
    const location = `${relative(root, sourceFile)}:${line}`;
    const targetApp = appForSpecifier(specifier, sourceFile);
    const add = (message) =>
      failures.push(`${location} ${message}: "${specifier}"`);

    if (sourcePackage && targetApp) add("shared packages cannot import apps");
    if (sourceApp && targetApp && targetApp !== sourceApp) {
      add("apps cannot import another app");
    }
    if (sourceApp && /^(?:firebase(?:\/|$)|@firebase\/)/.test(specifier)) {
      add("app source cannot import the Firebase SDK");
    }
    if (
      sourceApp &&
      (specifier === "@spaceman/app-firebase" ||
        specifier.includes("packages/app-firebase")) &&
      !isFirebaseAdapter(sourceFile, sourceApp)
    ) {
      add("only explicit identity/platform adapters may import app-firebase");
    }

    const webApp = sourceApp?.endsWith("-web");
    const nativeApp = sourceApp?.endsWith("-app");
    const nativeOnly =
      /^(?:react-native(?:\/|$)|@react-native(?:\/|-|$)|expo(?:\/|-|$)|@expo\/)/.test(
        specifier,
      );
    const webOnly =
      /^(?:react-dom(?:\/|$)|react-router-dom(?:\/|$)|vite(?:\/|$)|@vitejs\/)/.test(
        specifier,
      );
    if (sourcePackage && (nativeOnly || webOnly)) {
      add("shared packages cannot import platform-only modules");
    }
    if (webApp && nativeOnly) {
      add("web app source cannot import native-only modules");
    }
    if (nativeApp && webOnly) {
      add("native app source cannot import web-only modules");
    }
    if (webApp && /\.native(?:\.[cm]?[jt]sx?)?$/.test(specifier)) {
      add("web app source cannot import native platform files");
    }
    if (nativeApp && /\.web(?:\.[cm]?[jt]sx?)?$/.test(specifier)) {
      add("native app source cannot import web platform files");
    }
  }
}

if (failures.length > 0) {
  console.error(
    `Architecture boundary check failed:\n${failures.sort().join("\n")}`,
  );
  process.exitCode = 1;
} else {
  console.log(
    `Architecture boundary check passed for ${files.length} source files.`,
  );
}
