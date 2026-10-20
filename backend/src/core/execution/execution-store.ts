import type {
  ExecutionJob,
  ExecutionPlan,
} from "./model.js";

const plans =
  new Map<
    string,
    ExecutionPlan
  >();

const jobs =
  new Map<
    string,
    ExecutionJob
  >();

export function saveExecutionPlan(
  plan: ExecutionPlan,
): void {
  plans.set(
    plan.id,
    plan,
  );
}

export function getExecutionPlan(
  id: string,
): ExecutionPlan | undefined {
  return plans.get(id);
}

export function saveExecutionJob(
  job: ExecutionJob,
): void {
  jobs.set(
    job.id,
    job,
  );
}

export function getExecutionJob(
  id: string,
): ExecutionJob | undefined {
  return jobs.get(id);
}