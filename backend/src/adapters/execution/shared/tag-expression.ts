import type {
  LabelMatchMode,
} from "../../../core/execution/model.js";

export function buildTagExpression(
  labels: string[],
  labelMatch: LabelMatchMode,
): string | undefined {

  const normalized = [
    ...new Set(
      labels
        .map((label) => label.trim())
        .filter((label) => label.length > 0),
    ),
  ];

  if (normalized.length === 0) {
    return undefined;
  }

  const tags =
    normalized.map(
      (label) =>
        label.startsWith("@")
          ? label
          : `@${label}`,
    );

  if (tags.length === 1) {
    return tags[0];
  }

  const joiner =
    labelMatch === "ALL"
      ? " and "
      : " or ";

  return tags.join(joiner);
}
