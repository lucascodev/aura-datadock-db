# Changelog

**English** | [Português (Brasil)](CHANGELOG.pt-BR.md)

All notable changes to this project are recorded here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and versions follow [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added

- Link to GitHub Sponsors in the repository, in the README and on the extension page.

## [0.1.4] - 2026-11-04

### Added

- **Chart** button in the **Show SQL** panel of the table screen, which opens the result of a read query as a chart.

### Fixed

- The filter field now explains that it only takes a condition when it receives a whole query or a `;`, instead of showing a database syntax error.

## [0.1.3] - 2026-11-04

### Added

- Screenshots in the README, with fictional data.
- Security policy, with how to report a vulnerability in private.

### Fixed

- Details of the README: the SQL example of the charts, the link to `docker-compose.dev.yml` and the **Default** button of the data editor.

## [0.1.0] - 2026-11-04

### Added

- Brand identity: extension icon, activity bar icon, Marketplace banner color, README logo and GitHub social preview, in `docs/brand`.
- Interface and documentation in English and Brazilian Portuguese.
- `THIRD_PARTY_NOTICES.md`, with the licenses of the packages included in the extension, generated on every production build from what goes into the bundles.
- **DB Schema** section, with schemas, tables, columns, indexes and foreign keys of the selected connection, table filter and menu actions.
- Data editor: edit cells, add and delete rows, filters, sorting, server-side pagination and SQL preview, with writes in a transaction.
- Table screen with the **Properties** (columns, indexes, references in both directions and DDL), **Data** and **Diagram** (the table and its direct neighbors) tabs.
- In the **Data** tab: filter by SQL expression with `Ctrl+Space`, per-column menu, adjustable width, keyboard navigation, multi-row selection, duplicate rows, Grid, Text and Record modes, and **Value** panel.
- **Show SQL** opens the screen's `SELECT` below the grid, to edit and run. A read shows the result in the grid itself; anything else follows the safeguards of a normal query.
- **Export data** exports all rows that match the screen's filters, in batches.
- Structure actions that generate the SQL to review and run: create table, add, rename and drop column, rename, truncate and drop table, and create index.
- MariaDB as its own driver, and a driver selector in the connection form.
- Saved connections, besides containers: local or remote databases, with form, connection string and connection test.
- Per-connection TLS, in off, required and verified modes, with a CA file.
- SSH tunnel through the system `ssh`, with automatic reconnection.
- Per-connection read-only and confirmation of any write on a remote database.
- **Add New Connection** on the start screen and actions at the top of the view: new connection, new SQL, refresh and collapse all.
- **Disconnect** command to close the connection to a database.
- Interactive ER diagram with crow's foot notation, cardinality derived from the constraints and the levels all columns, keys only and entities only.
- Diagram export as SVG and PNG, and schema export as DDL, Mermaid, DBML and JSON.
- Result export as CSV, JSON, NDJSON, Markdown and SQL `INSERT`, to a file or the clipboard.
- Whole-table export in batches, with progress and cancellation.
- Results grid with one tab per statement, sorting, filtering, copying and virtual scrolling.
- Charts over query results: line, area, bar, pie, scatter with linear regression, histogram, boxplot and heatmap, with automatic suggestion, warnings about partial data and export as PNG and SVG.
- Running the statement under the cursor, the whole file (`Ctrl+Shift+Enter`), `EXPLAIN` and actions above each statement in the editor.
- Cancellation of a running query.
- Table and column autocomplete, with alias resolution.
- Query history in the sidebar.
- Foreign keys in the explorer, in the MCP `describe_schema` tool and in the context sent to the AI.
- Integration tests of the adapters against real databases (`npm run test:integration`).
- Automatic discovery of Postgres, MySQL and MariaDB containers, reading the credentials from the container.
- Explorer of schemas, tables and columns in the sidebar.
- Query editor with execution via `Ctrl+Enter` and a results panel.
- Read-only mode and confirmation of destructive statements.
- SQL generation with AI through VS Code models, Anthropic, OpenAI or Ollama.
- Read-only MCP server with the `list_databases`, `describe_schema` and `run_query` tools.

### Changed

- ER diagram exports (SVG and PNG) use the brand colors.
- Settings that choose where the extension connects or sends data only apply from user settings, and a repository can no longer turn off `readOnly` or `confirmDestructiveQueries`.
- The MCP server is off by default. The extension does not run in untrusted workspaces.
- Read-only mode is stricter: conditional comments count as SQL, functions that act on the server count as writes, and on Postgres each read runs in a read-only transaction.
- Passwords stored for a container belong to its Docker endpoint, and a container published on another machine counts as remote.
- CSV exports neutralize text cells that a spreadsheet would run as a formula.
- Databases are described in a driver registry, so adding a new one does not require touching the rest of the code.
- Code reorganized into layers (`domain`, `drivers`, `application`, `infrastructure`, `presentation` and `main`) and into subfolders by subject, with tests that prevent outward dependencies and crowded folders.
- Clicking a table opens the data editor, and clicking a connection selects it instead of expanding it.
- Docker is no longer required. Without it, the extension keeps working with saved connections.
- The **Containers** view is now called **Connections**.
- The automatic refresh only updates the tree when the list of connections has changed.
- `Ctrl+Enter` without a selection now runs the statement under the cursor, no longer the whole file.
- Several statements in the same submission now run in sequence, each confirmed separately and with its own result.
- Each SQL file is bound to the database it was first run on, instead of following the global active connection.
- The MCP `run_query` tool accepts one statement at a time.

### Fixed

- `BIGINT` above 2^53 lost precision in MySQL and MariaDB.
- Changing `auraDataDockDb.dockerHost` only took effect after restarting VS Code.
- With files from different containers open, a query could run on the wrong database.
- Columns with the same name, as in `SELECT a.id, b.id`, showed the same value.
- Stopping a container with an open connection could bring down the extension host, and the dead connection kept being used.
- Several statements in the same submission failed in MySQL and showed only the last result in Postgres.
- `SELECT` on a large table loaded all rows into memory before applying the limit.
- Dates without time zone in Postgres appeared shifted, converted to UTC.
- Columns appeared with generic types such as `ARRAY` and `USER-DEFINED` in Postgres.
- SQL analysis did not respect the dialect: in Postgres, a `#` JSON operator or a backslash in a string could hide a following statement from the risk classification.
