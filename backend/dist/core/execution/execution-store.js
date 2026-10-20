const plans = new Map();
const jobs = new Map();
export function saveExecutionPlan(plan) {
    plans.set(plan.id, plan);
}
export function getExecutionPlan(id) {
    return plans.get(id);
}
export function saveExecutionJob(job) {
    jobs.set(job.id, job);
}
export function getExecutionJob(id) {
    return jobs.get(id);
}
