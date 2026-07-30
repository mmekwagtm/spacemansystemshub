import { spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const projectId = process.env.SPACEMAN_FIREBASE_PROJECT_ID ?? "";
const scope = process.env.SPACEMAN_FIREBASE_DEPLOY_SCOPE ?? "";

if (!/^[a-z][a-z0-9-]{4,29}$/.test(projectId))
  throw new Error("SPACEMAN_FIREBASE_PROJECT_ID must be explicit and valid.");
if (!/^[A-Za-z0-9:,_-]+$/.test(scope))
  throw new Error("SPACEMAN_FIREBASE_DEPLOY_SCOPE must be explicit and valid.");

function git(arguments_) {
  const result = spawnSync("git", arguments_, {
    cwd: root,
    encoding: "utf8",
  });
  if (result.error || result.status !== 0)
    throw new Error(`git ${arguments_.join(" ")} failed.`);
  return result.stdout.trim();
}

const dirty = git(["status", "--porcelain=v1", "--untracked-files=all"]);
if (dirty)
  throw new Error("Evidenced deployment requires an exact clean Git revision.");
const revision = git(["rev-parse", "HEAD"]);
if (!/^[a-f0-9]{40}$/.test(revision))
  throw new Error("Git did not return an exact commit revision.");

const startedAt = new Date().toISOString();
const deploy = spawnSync(
  "corepack",
  [
    "pnpm",
    "exec",
    "firebase",
    "deploy",
    "--project",
    projectId,
    "--only",
    scope,
  ],
  {
    cwd: root,
    encoding: "utf8",
    stdio: "inherit",
    env: {
      ...process.env,
      FIREBASE_FUNCTIONS_DISCOVERY_OUTPUT_PATH: "true",
      FUNCTIONS_DISCOVERY_TIMEOUT: "60",
    },
  },
);
const completedAt = new Date().toISOString();
const status = deploy.error || deploy.status !== 0 ? "failed" : "deployed";
const evidenceDirectory = path.join(root, ".local-evidence", "deployments");
mkdirSync(evidenceDirectory, { recursive: true });
const evidencePath = path.join(
  evidenceDirectory,
  `${completedAt.replaceAll(":", "-")}-${projectId}-${revision.slice(0, 12)}.json`,
);
writeFileSync(
  evidencePath,
  `${JSON.stringify(
    {
      schemaVersion: 1,
      status,
      projectId,
      scope,
      revision,
      branch: git(["branch", "--show-current"]),
      startedAt,
      completedAt,
      worktreeCleanBeforeDeploy: true,
      worktreeCleanAfterDeploy:
        git(["status", "--porcelain=v1", "--untracked-files=all"]) === "",
      exitCode: deploy.status ?? 1,
    },
    null,
    2,
  )}\n`,
);
if (status !== "deployed")
  throw new Error(`Firebase deployment failed; evidence saved to ${evidencePath}.`);
console.log(
  `Firebase deployment evidence saved for ${projectId} at revision ${revision}: ${evidencePath}`,
);
