import * as core from "@actions/core";
import * as github from "@actions/github";
import { Context } from "@actions/github/lib/context";

const createPullRequest = (client: any, context: Context) => {
  const { pull_request: pr } = context.payload;

  if (!pr) {
    core.error("Event payload missing `pull_request`");
    return;
  }

  return {
    async addReviewers(reviewers: string[]) {
      const { owner, repo, number: pull_number } = context.issue;
      const result = await client.pulls.createReviewRequest({
        owner,
        repo,
        pull_number,
        reviewers,
      });
      core.debug(JSON.stringify(result));
    },
  };
};

export async function run() {
  try {
    const token = core.getInput("token", { required: true });
    const reviewers = core.getInput("reviewers", { required: true }).split(",");

    const client = new github.GitHub(token);

    const pr = createPullRequest(client, github.context);

    pr?.addReviewers(reviewers);
  } catch (error) {
    core.setFailed(error.message);
  }
}

run();
