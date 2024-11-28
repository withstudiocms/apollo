import { ParsedPR, PullRequest, PullRequestReplies, PullRequestState, ReviewStatus } from "@/commands/ptal";

/**
 * Converts a GitHub review status to a type-safe enum
 * @param status The review status from GitHub
 * @returns A review staus enum value
 */
const convertStateToStatus = (status: string): ReviewStatus => {
  if (status === "COMMENTED") return ReviewStatus.COMMENTED;
  if (status === "APPROVED") return ReviewStatus.APPROVED;
  if (status === "CHANGES_REQUESTED") return ReviewStatus.CHANGES_REQUESTED;
  return ReviewStatus.UNKNOWN;
}

/**
 * Handles the logic for parsing the review and PR data to reliably get a status.
 * @param pr The PR data
 * @param reviews The review data
 * @returns A pull request state
 */
const computePullRequestStatus = (
  pr: PullRequest,
  reviews: PullRequestReplies,
): PullRequestState => {
  if (pr.draft) {
    return "draft";
  }

  if (pr.merged) {
    return "merged";
  }

  if (
    !pr.mergeable || 
    reviews.length === 0 ||
    pr.mergeable_state === 'blocked'
  ) {
    return "waiting";
  }

  if (reviews.find((review) => review.state === "CHANGES_REQUESTED")) {
    return "changes";
  }

  if (pr.mergeable && !reviews.find((review) => review.state === "CHANGES_REQUESTED")) {
    return "approved";
  }

  return "waiting";
}

/**
 * Map for converting a PR state to the matching Discord label
 */
const prStatusMap = new Map<PullRequestState, string>([
  ['draft', `:white_circle: Draft`],
  ['approved', `:white_check_mark: Approved`],
  ['changes', `:no_entry_sign: Changes requested`],
  ['merged', `:purple_circle: Merged`],
  ['waiting', `:hourglass: Awaiting reviews`],
]);

/**
 * Takes in a PR and parses it for easy use in the Discord API.
 * @param pr The pr response data
 * @param reviews The reviews response data
 * @returns Parsed data
 */
const parsePullRequest = (
  pr: PullRequest,
  reviews: PullRequestReplies,
): ParsedPR => {
  let status = computePullRequestStatus(pr, reviews);

  return {
    status: {
      type: status,
      label: prStatusMap.get(status)!,
    },
    title: pr.title,
    reviews: reviews.map((review) => ({
      status: convertStateToStatus(review.state),
      author: review.user?.login || ''
    })),
  }
}

export { parsePullRequest };