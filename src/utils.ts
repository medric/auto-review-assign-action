import { Octokit } from "@octokit/rest";

export const allChecksSuccess = (
  checkRuns: Octokit.ChecksListForRefResponseCheckRunsItem[]
) =>
  checkRuns.every(
    (checkRun: Octokit.ChecksListForRefResponseCheckRunsItem) =>
      checkRun.conclusion === "success"
  );

export const allChecksCompleted = (
  checkRuns: Octokit.ChecksListForRefResponseCheckRunsItem[]
) =>
  checkRuns.every(
    (checkRun: Octokit.ChecksListForRefResponseCheckRunsItem) =>
      checkRun.status === "completed"
  );
