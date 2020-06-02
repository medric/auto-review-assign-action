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
      try {
        await client.pulls.createReviewRequest({
          owner,
          repo,
          pull_number,
          reviewers,
        });
      } catch (e) {
        throw e;
      }
    },
    async getCommitSha() {
      try {
        const {
          data: {
            head: { sha: commit_sha },
          },
        } = await client.pulls.get({ owner, pull_number, repo });

        return commit_sha || context.sha;
      } catch (e) {
        return e;
      }
    },
    async getCheckRuns(commitSha: string) {
      try {
        const {
          data: { check_runs },
        } = await client.checks
          .listForRef({
            owner,
            repo,
            ref: commitSha,
          })
          .catch((e) => {
            throw e;
          });

        return check_runs;
      } catch (e) {
        throw e;
      }
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

    if (checkRuns && allChecksSuccess(checkRuns)) {
      core.info(`PR @${github.context.sha} has passed`);
      return;
    }

    core.info(`PR @${github.context.sha} has failed`);
    pr.addReviewers(reviewers);
  } catch (error) {
    core.setFailed(error.message);
  }
}

run().then(() => core.info("Done!"));
