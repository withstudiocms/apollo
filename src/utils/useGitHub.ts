import { App, Octokit } from "octokit";
import 'dotenv/config';

let app: App | undefined;
let octokit: Octokit | undefined;

/**
 * Returns a new Octokit instance.
 */
export const useGitHub = async (): Promise<Octokit> => {
  if (!octokit || !app) {
    app = new App({
      appId: process.env.GITHUB_APP_ID,
      privateKey: process.env.GITHUB_PRIVATE_KEY,
      webhooks: {
        secret: process.env.GITHUB_WEBHOOK_SECRET,
      }
    });

    octokit = await app.getInstallationOctokit(Number.parseInt(process.env.GITHUB_INSTALLATION_ID));
  }

  return octokit;
}
