import * as core from "@actions/core";
import * as github from "@actions/github";
import { Context } from "@actions/github/lib/context";
import { Octokit } from "@octokit/rest";
import { poll } from "./poll";
import { allChecksSuccess, allChecksCompleted } from "./utils";

const DEFAULT_POLL_TIMEOUT = 3600 * 10; // 20 minutes
const DEFAULT_POLL_INTERVAL = 3600 * 5; // 5 minutes

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

      return commit_sha || context.sha;
    },
    async getCheckRuns(commitSha: string) {
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
    const commitSha = await pr.getCommitSha();

    const checkRuns = await poll<
      Octokit.ChecksListForRefResponseCheckRunsItem[]
    >(
      () => pr.getCheckRuns(commitSha),
      allChecksCompleted,
      DEFAULT_POLL_TIMEOUT,
      DEFAULT_POLL_INTERVAL
    );

    if (checkRuns && !allChecksSuccess(checkRuns)) {
      core.info(`PR @${github.context.sha} has failed`);
      pr.addReviewers(reviewers);
      return;
    }

    core.info(`PR @${github.context.sha} has passed`);

    return;
  } catch (error) {
    core.setFailed(error.message);
  }
}

run().then(() => core.info("Done!"));
