/**
 * GitHub integration (server only).
 *
 * The repository is the project's source of truth for code and history. The
 * portal shows its live status in Settings; calls are lazy (only when that
 * panel loads) and cached, and `GITHUB_TOKEN` never leaves the server.
 */

import {
  githubRepo,
  githubRepoUrl,
  githubToken,
} from "@/lib/integrations/config.server";
import { cached } from "@/lib/integrations/cache.server";
import type { GithubCommit, GithubStatus } from "@/lib/integrations/types";

export type { GithubCommit, GithubStatus };

type GithubRepoPayload = {
  full_name?: string;
  name?: string;
  description?: string | null;
  private?: boolean;
  default_branch?: string;
  stargazers_count?: number;
  forks_count?: number;
  open_issues_count?: number;
  pushed_at?: string;
  html_url?: string;
};

type GithubCommitPayload = {
  sha?: string;
  html_url?: string;
  commit?: {
    message?: string;
    author?: { name?: string; date?: string };
  };
};

function headers(token: string | undefined): HeadersInit {
  const result: Record<string, string> = {
    accept: "application/vnd.github+json",
    "x-github-api-version": "2022-11-28",
    "user-agent": "aaphreml-irerc-portal",
  };
  if (token) result.authorization = `Bearer ${token}`;
  return result;
}

function errorMessage(status: number, detail: string): string {
  if (status === 404) {
    return "Repository not found. Confirm GITHUB_REPO and that a token is provided for a private repository.";
  }
  if (status === 401) {
    return "GitHub rejected the token. Check GITHUB_TOKEN.";
  }
  if (status === 403) {
    return `GitHub refused the request (403). ${detail || "The API rate limit may be exhausted."}`.trim();
  }
  return `GitHub request failed (${status}).${detail ? ` ${detail}` : ""}`;
}

async function githubGet(path: string): Promise<unknown> {
  const response = await fetch(`https://api.github.com/repos/${githubRepo()}${path}`, {
    headers: headers(githubToken()),
    cache: "no-store",
  });
  if (!response.ok) {
    let detail = "";
    try {
      const payload = (await response.json()) as { message?: string };
      detail = payload.message ?? "";
    } catch {
      detail = await response.text().catch(() => "");
    }
    throw new Error(errorMessage(response.status, detail));
  }
  return response.json();
}

export async function githubStatus(): Promise<GithubStatus> {
  const repo = githubRepo();
  const url = githubRepoUrl();
  try {
    return await cached("github:status", 5 * 60_000, async () => {
      const [repoPayload, commitsPayload] = (await Promise.all([
        githubGet(""),
        githubGet("/commits?per_page=1"),
      ])) as [GithubRepoPayload, GithubCommitPayload[]];

      const commit = commitsPayload[0];
      return {
        repo,
        url: repoPayload.html_url ?? url,
        connected: true,
        name: repoPayload.name,
        description: repoPayload.description ?? undefined,
        private: repoPayload.private,
        defaultBranch: repoPayload.default_branch,
        stars: repoPayload.stargazers_count,
        forks: repoPayload.forks_count,
        openIssues: repoPayload.open_issues_count,
        pushedAt: repoPayload.pushed_at,
        latestCommit: commit
          ? {
              sha: commit.sha ?? "",
              shortSha: (commit.sha ?? "").slice(0, 7),
              message: (commit.commit?.message ?? "").split("\n")[0] ?? "",
              author: commit.commit?.author?.name ?? "Unknown",
              date: commit.commit?.author?.date ?? "",
              url: commit.html_url ?? url,
            }
          : null,
      };
    });
  } catch (cause) {
    return {
      repo,
      url,
      connected: false,
      error: cause instanceof Error ? cause.message : "GitHub could not be reached.",
    };
  }
}
