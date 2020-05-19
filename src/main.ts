import * as core from "@actions/core";
import * as github from "@actions/github";
import { Context } from "@actions/github/lib/context";
import { Octokit } from "@octokit/rest";
import { poll } from "./poll";
import { allChecksSuccess, allChecksCompleted } from "./utils";

const DEFAULT_TIMEOUT = 3600 * 10; // 10 minutes

const createPullRequest = (client: Octokit, context: Context) => {
  const { pull_request: pr } = context.payload;
  const { owner, repo, number: pull_number } = context.issue;

  if (!pr) {
    throw new Error("Event payload missing `pull_request`");
  }

  return {
    async addReviewers(reviewers: string[]) {
      const result = await client.pulls.createReviewRequest({
        owner,
        repo,
        pull_number,
        reviewers,
      });
      core.debug(JSON.stringify(result));
    },
    async getCommitSha() {
      const {
        data: {
          head: { sha: commit_sha },
        },
      } = await client.pulls.get({ owner, pull_number, repo });

      return commit_sha;
    },
    async getCheckRuns() {
      const commitSha = await this.getCommitSha();
      const {
        data: { check_runs },
      } = await client.checks.listForRef({
        owner,
        repo,
        ref: commitSha,
      });

      return check_runs;
    },
  };
};

export async function run() {
  try {
    const token = core.getInput("token", { required: true });
    const reviewers = core.getInput("reviewers", { required: true }).split(",");

    const client = (new github.GitHub(token) as unknown) as Octokit;

    const pr = createPullRequest(client, github.context);

    const checkRuns = await poll<
      Octokit.ChecksListForRefResponseCheckRunsItem[]
    >(pr.getCheckRuns, DEFAULT_TIMEOUT, 5000, allChecksCompleted);

    if (checkRuns && !allChecksSuccess(checkRuns)) {
      pr.addReviewers(reviewers);
    }
  } catch (error) {
    core.setFailed(error.message);
  }
}

run();
