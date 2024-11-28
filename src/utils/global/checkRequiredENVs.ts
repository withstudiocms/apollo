type EnvStatus = {
  valid: boolean;
  message: string;
};

const requiredEnvs = [
  "DISCORD_APP_TOKEN",
  "DISCORD_CLIENT_ID",
  "TURSO_URL",
  "GITHUB_APP_ID",
  "GITHUB_CLIENT_ID",
  "GITHUB_PRIVATE_KEY",
  "GITHUB_INSTALLATION_ID",
  "GITHUB_WEBHOOK_SECRET"
];

const checkRequiredENVs = (): EnvStatus => {
  let valid = true;
  let envs: string[] = [];

  for (const env of requiredEnvs) {
    if (!process.env[env]) {
      valid = false;
      envs.push(`"${env}"`);
    }
  }

  const missingEnvs = envs.join(", ");
  const message = `The following environment variables are required but not set: ${missingEnvs}`;

  return { valid, message };
}

export { checkRequiredENVs };