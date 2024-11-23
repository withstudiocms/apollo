import { App, Octokit } from "octokit";
import 'dotenv/config';
import jwt from "jsonwebtoken";

let octokit: Octokit | undefined;

/**
 * Returns a new Octokit instance.
 */
export const useGitHub = async (): Promise<Octokit> => {
  if (!process.env.GITHUB_APP_ID) {
    throw new Error(`"GITHUB_APP_ID" env must be set!`);
  }

  if (!process.env.GITHUB_CLIENT_ID) {
    throw new Error(`"GITHUB_CLIENT_ID" env must be set!`);
  }

  if (!process.env.GITHUB_USERNAME_OR_ORG) {
    throw new Error(`"GITHUB_USERNAME_OR_ORG" env must be set!`);
  }

  if (!process.env.GITHUB_PRIVATE_KEY) {
    throw new Error(`"GITHUB_PRIVATE_KEY" env must be set!`);
  }

  if (!process.env.GITHUB_INSTALLATION_ID) {
    throw new Error(`"GITHUB_INSTALLATION_ID" env must be set!`);
  }

  if (!octokit) {
    const app = new App({
      appId: process.env.GITHUB_APP_ID,
      privateKey: process.env.GITHUB_PRIVATE_KEY,
    });

    octokit = await app.getInstallationOctokit(Number.parseInt(process.env.GITHUB_INSTALLATION_ID));
  }
  

  return octokit;
}
