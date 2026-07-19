const userAgent = process.env.npm_config_user_agent ?? "";

if (!userAgent.startsWith("pnpm/")) {
  console.error("spacemansystems uses pnpm only. Run the command through Corepack pnpm.");
  process.exitCode = 1;
}
