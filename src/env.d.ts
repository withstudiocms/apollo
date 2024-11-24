declare global {
  namespace NodeJS {
    interface ProcessEnv {
      DISCORD_APP_TOKEN: string;
      DISCORD_CLIENT_ID: string;
      TURSO_URL: string;
      TURSO_AUTH_TOKEN?: string;
      GITHUB_APP_ID: string;
      GITHUB_CLIENT_ID: string;
      GITHUB_PRIVATE_KEY: string;
      GITHUB_INSTALLATION_ID: string;
    }
  }
}

export {};