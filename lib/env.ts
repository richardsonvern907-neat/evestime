export function requireEnv(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

export function getFirstEnv(names: readonly string[]): string | undefined {
  for (const name of names) {
    const value = process.env[name];

    if (value) {
      return value;
    }
  }

  return undefined;
}

export function requireAnyEnv(names: readonly string[]): string {
  const value = getFirstEnv(names);

  if (!value) {
    throw new Error(`Missing required environment variable. Expected one of: ${names.join(", ")}`);
  }

  return value;
}
