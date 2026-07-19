import { readdir, readFile } from "node:fs/promises";
import { resolve } from "node:path";

const repositoryRoot = resolve(import.meta.dirname, "../..");
const projectDocsDirectory = resolve(repositoryRoot, "docs/project-docs");
const forbiddenMarker = "<" + "FILL-IN>";
const documents = [resolve(repositoryRoot, "AGENTS.md")];

async function collectMarkdownFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      const entryPath = resolve(directory, entry.name);
      if (entry.isDirectory()) {
        return collectMarkdownFiles(entryPath);
      }
      return entry.name.endsWith(".md") ? [entryPath] : [];
    })
  );

  return files.flat();
}

documents.push(...(await collectMarkdownFiles(projectDocsDirectory)));

const failures = [];
for (const documentPath of documents) {
  const document = await readFile(documentPath, "utf8");
  if (document.includes(forbiddenMarker)) {
    failures.push(documentPath.replace(`${repositoryRoot}/`, ""));
  }
}

if (failures.length > 0) {
  console.error(`Documentation contains unresolved markers: ${failures.join(", ")}`);
  process.exitCode = 1;
} else {
  console.log(`Documentation check passed for ${documents.length} governance/project documents.`);
}
