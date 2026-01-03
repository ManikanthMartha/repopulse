export function requireEnv(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (!value) {
    throw new Error(`Missing required environment variable ${name}`);
  }
  return value;
}

export function assertRepoFullName(fullName: string): string {
  const isValid = /.+\/.+/.test(fullName);
  if (!isValid) {
    throw new Error("Repository must be in the form owner/name");
  }
  return fullName.toLowerCase();
}

export function repoInputToFullName(input: string): string {
  const trimmed = input.trim();
  const sanitized = trimmed
    .replace(/^https?:\/\/github\.com\//i, "")
    .replace(/\.git$/, "")
    .replace(/\/$/, "");
  return assertRepoFullName(sanitized);
}

export function normalizeLabels(labels: string[]): string[] {
  return labels.map((label) => label.trim().toLowerCase()).filter(Boolean);
}
