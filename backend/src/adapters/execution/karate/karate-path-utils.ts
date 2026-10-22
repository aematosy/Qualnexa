const CLASSPATH_ROOTS = [
  "src/test/resources/",
  "src/test/java/",
  "src/main/resources/",
  "src/main/java/",
];

export function toKarateClasspathPath(
  relativePath: string,
  line?: number | undefined,
): string {

  const normalized =
    relativePath.replace(/\\/g, "/");

  for (const root of CLASSPATH_ROOTS) {
    if (normalized.startsWith(root)) {
      const base =
        `classpath:${normalized.slice(root.length)}`;

      return line
        ? `${base}:${line}`
        : base;
    }
  }

  const base = `classpath:${normalized}`;

  return line
    ? `${base}:${line}`
    : base;
}

export function buildKarateOptions(
  options: {
    paths?: string[] | undefined;
    tagExpression?: string | undefined;
  },
): string | undefined {

  const tokens: string[] = [];

  if (options.tagExpression) {
    tokens.push(
      "--tags",
      options.tagExpression,
    );
  }

  if (options.paths && options.paths.length > 0) {
    tokens.push(
      ...options.paths,
    );
  }

  return tokens.length > 0
    ? tokens.join(" ")
    : undefined;
}
