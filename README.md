# Apollo
Apollo is a fully-configurable Discord Bot that helps with managing Discord Servers for OSS projects.

## Table of Contents
- [Tech Stack](#tech-stack)
- [Getting Started / Prerequisites](#getting-started--prerequisites)
  - [Environment Variables](#environment-variables)
    - [Discord](#discord)
    - [Turso](#turso)
    - [GitHub](#github)
  - [Starting the Bot](#starting-the-bot)
    - [Docker](#docker)
- [Commands](#commands)
- [Contributing](#contributing)
- [License](#license)

## Tech Stack
- 🤖 Discord.js
- 🌧️ Drizzle ORM
- 🪶 libSQL

## Getting Started / Prerequisites
Clone this repo and install all relevant dependencies. We recommend `pnpm` for doing so.

### Environment Variables
The following environment variables need to be set in order for the bot to function:

#### Discord
You can get these two from the [Discord Developer Portal](https://discord.com/developers)
by creating a new app and configuring it to be a bot. Both of these are required.

```env
DISCORD_APP_TOKEN=...
DISCORD_CLIENT_ID=...
```

#### Turso
Apollo uses a Turso database to store all relevant data, using Drizzle as it's ORM.
Because we're using `drizzle-orm/libsql/node`, you can theoretically run your database
with any of the allowed protocols.

For more information, check the [Drizzle ORM Documentation about drivers](https://orm.drizzle.team/docs/get-started-sqlite#step-2---initialize-the-driver).

```env
TURSO_URL=libsql://... # Required!
TURSO_AUTH_TOKEN=... # Optional, only if you have an auth token! Not needed for local DBs.
```

#### GitHub
The `/ptal` command is powered by the GitHub API, for which you need to create a GitHub
App and install it in your organization, for yourself or for a specific repository.

You'll get the App ID and Client ID as soon as you create the app. The webhook secret you'll
get when creating a webhook for your app installation, and the private key you need to add manually. 
You also need to generate it yourself. The easiest way of doing so is by running the following 
command in your terminal (requires OpenSSL to be installed):

```bash
openssl genpkey -algorithm RSA -out private_key.pem -pkeyopt rsa_keygen_bits:2048
```

The installation ID is a bit more tricky to get. We recommend you follow
[GitHub's Documentation](https://docs.github.com/en/apps/creating-github-apps/authenticating-with-a-github-app/authenticating-as-a-github-app-installation#using-octokitjs-to-authenticate-with-an-installation-id)
for this.

```env
GITHUB_APP_ID=...
GITHUB_CLIENT_ID=...
GITHUB_WEBHOOK_SECRET=...
GITHUB_INSTALLATION_ID=...
GITHUB_PRIVATE_KEY="
-----BEGIN RSA PRIVATE KEY-----
...
-----END RSA PRIVATE KEY-----
" # Multiline on purpose! Yes, this works.
```

### Starting the Bot
Once you've set all variables, start the bot by running:
```bash
pnpm start
```

#### Docker
This project has its own Dockerfile which you can use to deploy the Bot in a container.
Build the image by running the following command in the root of the project after cloning it:

```
docker build --tag "apollo" .
```

You can then start a container with this image by running:

```
docker run "apollo"
```

If you want to run the image in the background, you can use the `--detach` flag:

```
docker run --detach "apollo"
```

## Commands
| Command                   | Description                                                                                             | Minimum Permissions |
| ------------------------- | ------------------------------------------------------------------------------------------------------- | ------------------- |
| `/ptal`                   | Creates a PTAL announcement in the current channel and pings the notifications role (if configured).    | Moderate Members    |
| `/settings`               | Command which carries the sub-commands for configuring the bot.                                         | Administrator       |
| `/settings set-forum`     | Allows you to configure the Forum to be used for support requests.                                      | Administrator       |
| `/settings set-ptal-role` | Sets the role that gets pinged when a new PTAL announcement is sent.                                    | Administrator       |
| `/settings print`         | Prints an overview of all settings.                                                                     | Administrator       |
| `/solved`                 | Sends an embed with buttons so the OP of a support request can close it. | Moderate Members    |
| `/support`                | Creates a new post in the support forum based on the message you supply.                                | Moderate Members    |

## Contributing
See our [Contribution Guide](https://github.com/withstudiocms/apollo/blob/main/CONTRIBUTING.md).

## License
© StudioCMS 2024. MIT Licensed.