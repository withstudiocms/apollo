# Apollo

Apollo is a fully-configurable Discord Bot that helps with managing Discord Servers for OSS projects.

## Tech Stack

- 🤖 Discord.js
- 🌧️ Drizzle ORM
- 🪶 libSQL


## Getting Started

Clone this repo and install all relevant dependencies. We recommend `pnpm` for doing so.

### Environment Variables

The following environment variables need to be set in order for the bot to function:
```env
# Discord-relatated. Get these from the developer portal (discord.com/developers)
DISCORD_APP_TOKEN=...
DISCORD_CLIENT_ID=...

# Turso ENVs. You have to create a Turso DB to get these.
TURSO_URL=libsql://...
TURSO_AUTH_TOKEN=...

# GitHub App Information. 
GITHUB_APP_ID=...
GITHUB_CLIENT_ID=...
GITHUB_USERNAME_OR_ORG=...
GITHUB_INSTALLATION_ID=... # This has to be retrieved manually
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

## Contributing
See our [Contribution Guide](https://github.com/withstudiocms/apollo/blob/main/CONTRIBUTING.md).

## License

© StudioCMS 2024. MIT Licensed.