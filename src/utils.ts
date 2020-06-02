import { Octokit } from "@octokit/rest";

export const allChecksSuccess = (
  checkRuns: Octokit.ChecksListForRefResponseCheckRunsItem[]
) => false;
  // checkRuns.every(
  //   (checkRun: Octokit.ChecksListForRefResponseCheckRunsItem) =>
  //     checkRun.conclusion === "success"
  // );

export const allChecksCompleted = (
  checkRuns: Octokit.ChecksListForRefResponseCheckRunsItem[]
) => true;
  // checkRuns.every(
  //   (checkRun: Octokit.ChecksListForRefResponseCheckRunsItem) =>
  //     checkRun.status === "completed"
  // );
