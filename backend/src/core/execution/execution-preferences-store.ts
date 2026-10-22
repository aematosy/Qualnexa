import type {
  ExecutionPreferences,
} from "./model.js";

const preferences =
  new Map<
    string,
    ExecutionPreferences
  >();

export function getExecutionPreferences(
  projectId: string,
): ExecutionPreferences | undefined {

  return preferences.get(
    projectId,
  );
}

export function saveExecutionPreferences(
  value: ExecutionPreferences,
): ExecutionPreferences {

  preferences.set(
    value.projectId,
    value,
  );

  return value;
}
