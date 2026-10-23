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

const jobOrder:
  string[] = [];

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
  if (!jobs.has(job.id)) {
    jobOrder.unshift(job.id);
  }

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

export function listExecutionJobs(): ExecutionJob[] {
  return jobOrder
    .map(
      (id) => jobs.get(id),
    )
    .filter(
      (
        job,
      ): job is ExecutionJob =>
        Boolean(job),
    );
}