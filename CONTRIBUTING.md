# Contributing

**English** | [Português (Brasil)](CONTRIBUTING.pt-BR.md)

Thanks for your interest! Issues and pull requests are welcome.

## Setting up the environment

```bash
git clone https://github.com/lucascodev/aura-datadock-db.git
cd aura-datadock-db
npm install
docker compose -f docker-compose.dev.yml up -d
```

Open the folder in VS Code and press `F5`. The `docker-compose.dev.yml` starts a Postgres and a MySQL with sample tables to try things out. The seeds only run when the database is created; after changing them, recreate the containers with `docker compose -f docker-compose.dev.yml down -v` followed by `up -d`.

## Code standards

- Code, names and commit messages in English.
- Documentation exists in English and Brazilian Portuguese, and a change updates both versions. UI text also exists in both languages.
- Clean Code as a reference: small functions, names that explain the intent, one concept per file.
- No comments in the code. If something needs an explanation, prefer a better name or extract a function. Architecture decisions live in [docs/architecture.md](docs/architecture.md).
- Dependencies point only inward, as described in [docs/architecture.md](docs/architecture.md). `vscode` only appears in `presentation/vscode` and in `main`, so the rest stays usable by the MCP server.
- The code in `presentation/webview` runs in the browser: it does not import `vscode` or Node APIs, and talks to the extension only through messages.
- Each file lives in a subfolder of its subject. A folder has files or subfolders, never both, and at most 8 files. The tests in `test/architecture/` enforce these rules.
- Every new rule in `application` or `infrastructure/docker` comes with a test in `test/unit/`, in the same tree as `src`.
- Changes to adapter SQL come with a test in `test/integration/`, which runs against real databases.

Before opening the pull request:

```bash
npm run typecheck
npm test
npm run test:integration
```

The `test:integration` uses `docker-compose.test.yml`, with its own ports and in-memory data, and removes the containers at the end. It also starts a Postgres with TLS and an SSH server, and therefore needs `ssh`, `ssh-keygen` and `ssh-keyscan` on the `PATH`.

## Adding a driver

Everything that changes from one database to another lives in `src/drivers/` and `src/infrastructure/database/`. No other code needs to know the database exists, and an architecture test prevents comparisons with the driver id outside those two folders.

1. Create `src/drivers/<database>/descriptor.ts` with a `DriverDescriptor`: name, default port, connection string schemes, dialect and, if there is an official image, Docker discovery.
2. Register the descriptor in `src/drivers/catalog/driverDescriptors.ts`. The database already appears in the connection form.
3. Create `src/infrastructure/database/<database>/<Database>Adapter.ts` implementing `DatabaseAdapter`, if the protocol is new. Compatible databases can reuse an adapter, as MariaDB does with `MysqlAdapter`.
4. Register the adapter in `src/infrastructure/database/factory/adapterFactories.ts`.
5. Include the database in `docker-compose.test.yml`, `scripts/runIntegrationTests.mjs` and in the `engines` lists of `test/integration/adapters.test.ts` and `test/integration/tableEditing.test.ts`. That is the contract suite every driver must pass.
6. Add the database to the README list, in both versions.

A file-based database, such as SQLite, still needs a change in the form, which today always asks for host and port.

## Translations

English is the source and each English message is its own key. The code calls `l10n.t('Message {0}', value)`, from `src/domain/i18n/l10n.ts`; the first argument is always a plain string literal. Never call it at module load, because the catalog is only set in `activate()` and at the top of each webview `main.ts`: use a function or a lazy field.

- Runtime text is translated in `l10n/bundle.l10n.pt-br.json`.
- Texts in `package.json` use `%key%`, with `package.nls.json` and `package.nls.pt-br.json`.
- Tests fail if a key is missing or has different placeholders.
- To add a language, add the same two files for its locale.

Not translated on purpose: the Output channel logs, the MCP tool descriptions, the prompt sent to AI models, and the generated SQL, DDL and export files.

## Reporting problems

Include the VS Code version, the operating system, how Docker is installed (Desktop, Engine, Colima, Podman) and the database image. The **Output > Aura DataDock DB** tab shows the extension logs.
