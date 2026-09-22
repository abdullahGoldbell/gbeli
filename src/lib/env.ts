/**
 * Read a required environment variable. Throws at module load if missing so a
 * misconfigured deployment fails fast instead of silently running with a
 * hardcoded fallback secret.
 */
export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}
