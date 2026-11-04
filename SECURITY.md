# Security policy

**English** | [Português (Brasil)](SECURITY.pt-BR.md)

## Reporting a vulnerability

Please do not open a public issue. [Report it privately on GitHub](https://github.com/lucascodev/aura-datadock-db/security/advisories/new), so that only the maintainer can see it until a fix is available.

Include what you can of the following:

- The affected version and your operating system
- The steps to reproduce the problem
- What an attacker could do with it

Never send real passwords, tokens or production data in a report.

## Supported versions

Only the latest published version receives security fixes.

## What happens next

This project is maintained by one person, so replies depend on availability. A confirmed problem is fixed in a new version, and the report can be made public after that. Say in the report if you would like to be credited.

## Scope

Reports about the extension and its MCP server are welcome, for example a repository that weakens a protection, a way around read-only mode or a leak of stored credentials.

The [Security section of the README](README.md#security) lists known limits, such as the TLS **Required** mode not validating certificates. Problems in a dependency are welcome too if they affect this extension.
