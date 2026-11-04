# Architecture

**English** | [Português (Brasil)](architecture.pt-BR.md)

The code follows layers with dependencies pointing only inward. The domain and the rules know nothing about VS Code, the database or the browser. That is why the MCP server, which runs as a separate process, reuses exactly the same logic as the extension, and the rules are tested without starting anything.

```
domain  ←  drivers  ←  application  ←  infrastructure
                                   ←  presentation
                                            ↑
                                   main (knows all)
```

## Layers

```
src/
  domain/           Pure types and contracts
    connection/       Connection targets, TLS, SSH and credentials
    database/         DatabaseAdapter, statements and results
    driver/           A driver's contract and SQL dialect
    i18n/             Message translation, without depending on VS Code
    schema/           Tables, columns, indexes and keys
  drivers/          Database catalog, pure: no connection happens here
    catalog/          Catalog lookup and identifier quoting
    postgres/, mysql/, mariadb/   Descriptor and dialect of each database
  application/      Rules and use cases, with no external libraries
    ai/               Provider contract and prompt building
    charts/           Column types, suggestion, data for each chart and statistics
    completion/       Autocomplete suggestions
    connections/      Lifecycle, saved connections and error and safeguard guidance
    diagram/          Diagram model, layout and SVG
    editing/          Pending changes, table navigation and structure changes
    export/           Row encoders and format catalog
    format/           Formatting of values and names
    query/            SQL analysis, execution, history and file-database binding
    schema/           Reading, relationships and rendering as DDL, Mermaid and DBML
    sql/              Literals, conditional quoting and statement templates
  infrastructure/   Implementations that talk to the outside world
    ai/               Anthropic, OpenAI and Ollama
    database/         One DatabaseAdapter per protocol, and the factory that picks them
    docker/           Docker Engine client and container discovery
    ssh/              Tunnel through the system ssh and the TunneledAdapter decorator
  presentation/     What the user sees and uses
    contracts/        Typed messages between the extension and the webviews
    vscode/           Commands, TreeViews, panels, CodeLens and autocomplete
    webview/          Code that runs in the browser, with no access to Node or VS Code
  main/             Composition: creates the dependencies and wires everything
    extension.ts      Extension entry point
    mcpServer.ts      MCP server entry point
    createAiProvider.ts   Picks the AI provider from the configuration
```

## Rules

| Layer | May import | External libraries |
|---|---|---|
| `domain` | nothing | none |
| `drivers` | `domain` | none |
| `application` | `domain`, `drivers` | none |
| `infrastructure` | `domain`, `drivers`, `application` | `pg`, `mysql2`, `node:*` |
| `presentation/contracts` | `domain`, `application` | none |
| `presentation/webview` | `domain`, `drivers`, `application`, `contracts` | none, except `echarts` in `chart/echarts/` |
| `presentation/vscode` | `domain`, `drivers`, `application`, `contracts` | `vscode`, `node:*` |
| `main` | all | all |

In folders:

- A folder has files or subfolders, never both. The only exception is each webview's `main.ts`, which is the bundle entry point.
- At most 8 files per folder. Past that, split by subject.

The tests in `test/architecture/` read the imports of all of `src` and fail if any of these rules is broken, including in `import type`, because an imported type also couples.

When the inner layer needs something from outside, it receives it by injection, and only `main` knows the implementation. The `ConnectionManager` receives `openAdapter`, the `ConnectionFormPanel` too, and the commands ask for the AI provider through `DataDockContext.createAiProvider`.

`drivers` is a layer of its own because almost everything queries it, including the browser, to learn the dialect or fill in the form. It only describes the databases. The adapter factories, which carry `pg` and `mysql2`, live in `infrastructure/database/factory`, so they do not end up in the webview bundles.

`VsCodeLmProvider` lives in `presentation/vscode` even though it is an AI provider, because it depends on the VS Code API. That way, `vscode` only appears in `presentation/vscode` and in `main`.

The webviews talk to the extension only through messages, typed in `presentation/contracts`, and have their own `tsconfig` with the `DOM` library.

The tests live in `test/unit`, in the same tree as `src`, and in `test/integration`, against real databases.

## Decisions

### Driver registry

Everything that changes from one database to another lives in `drivers/` and in `infrastructure/database/`. The descriptor (`DriverDescriptor`) is pure and gathers the default port, connection string schemes, Docker discovery and SQL dialect. The adapter factories live in `infrastructure/database/factory`, so the webviews can read the descriptor without bundling `pg` and `mysql2`. `application` and `presentation` only ask the catalog, never compare ids. An architecture test fails if that happens again, and another registers a fake driver and exercises it across the whole chain.

`DriverId` is a string, not a closed union: the catalog is the source of truth, and unknown ids are rejected at the edge, when reading the saved connections.

Driver and adapter are separate things because MySQL and MariaDB speak the same protocol: they are two drivers with a single adapter. A file-based database, such as SQLite, would still need a form without host and port.

### Data editing

Changes stay pending in the webview as a list of `RowChange`, and only become SQL in the extension. The webview can ask for anything, so `buildRowChangeStatements` checks again that the table allows the operation and that the columns exist and can be changed.

Values always go as parameters. Each statement also carries a `preview` with literals, read-only, built from the same parts instead of substituting placeholders in the text, which would break with a `?` inside a string.

Saving uses a dedicated connection, so the transaction does not mix with the other queries of the main connection. It inherits the session's read-only mode, so the database rejects the write even if the extension's check fails. Each change must affect exactly one row; otherwise, the whole transaction is rolled back.

The editor reads values as the text the database returns, instead of letting the driver convert them. That way an array stays as `{a,b}` instead of becoming JSON, and what the dev edits is the format the database accepts back. In MySQL, `supportBigNumbers` prevents a `BIGINT` from losing precision, which would make an `UPDATE` hit another row.

VS Code does not allow preventing a webview from closing. So the extension keeps the pending changes and, if the tab closes with any, offers to reopen it with them.

### Table screen

The Data tab state lives in `presentation/webview/table/data/state/DataTabState.ts`, with no DOM and tested with Vitest. The components (`DataGrid`, `FilterBar`, `BottomBar`, `ValuePanel`, `RecordView`, `SqlPanel`) only draw that state and notify `main.ts`. Selecting a cell swaps a class instead of redrawing the grid: redrawing on the first click would destroy the cell and the double-click would never open editing. For the same reason, selection happens on `mousedown`, before the `blur` of an open edit saves and redraws.

The filter expression is the only hand-written SQL on this screen, and it has three barriers:

1. `validateWhereExpression` uses `classifyQuery` to require a single read statement. It is text analysis, and does not see a function with side effects.
2. The expression goes inside parentheses and on its own lines, so a `--` does not comment out the rest of the query.
3. The database runs only one statement per call. In MySQL and MariaDB this comes from `execute`, with a prepared statement. In Postgres, `pg` uses the simple protocol, which accepts several statements, when the query has no parameters; that is why `queryPage` and `applyStatements` force `queryMode: 'extended'`. An integration test runs `SELECT ...; DELETE ...` directly on the adapter and checks that no row disappeared.

The SQL in the panel below the grid takes another path. A single read statement goes to `runQuery` and appears in the grid, without editing, because an arbitrary result has no way to identify the source row. Everything else goes to `executeQuery`, which applies the same confirmations as the editor and returns whether it actually ran, so the screen does not claim anything when the confirmation is declined.

### Charts

From query to drawing, the path is `rows → column types → suggestion → ChartConfig → buildChartData → ChartData → toEChartsOption → ECharts`. Up to `ChartData`, everything lives in `application/charts`, pure and tested without a browser. ECharts only appears in `presentation/webview/chart/echarts`, behind the `ChartRenderer` contract; an architecture test prevents it from leaking out of there. If another library is needed, it implements that contract.

Histogram, boxplot and linear regression are computed here, in `application/charts/statistics`, and not by `echarts-stat`, which has not been updated since 2022. The histogram picks its bins by Freedman-Diaconis, falling back to Sturges when the interquartile range is zero. Quartiles use linear interpolation, and outliers are beyond 1.5 times that range.

The webviews' CSP forbids inline `style` attributes, and ECharts' default tooltip builds HTML with them: there were 21 violations in the technical proof of concept. So the tooltip receives elements created in code by `createTooltipContent`, and the CSP did not have to be loosened.

ECharts weighs about 680 KB minified, so it goes in a bundle of its own, `dist/webview/chart.js`. It only loads when the Chart view is opened, in a `<script>` tag with the page's nonce, whose address comes in `data-chart-script`.

Dates are read as written, without applying the time zone offset, and the axis uses UTC only so it does not convert again. That way the chart shows the same value as the grid, and a `date_trunc` does not fall on the previous day for someone in another time zone.

A chart misleads more easily than a table. So anything that changes the drawing becomes a visible `ChartNotice`: cut-off result, rows without a value, sums, series grouped into Other and approximated integers. The palette is fixed and validated for color blindness on VS Code's default surfaces; the theme's `charts-*` colors have no such guarantee. For the same reason, there is a single Y axis, at most 8 series, or 3 in the scatter, and the pie is never suggested automatically.

### Structure generated for review

Structure changes are not executed by the interface: they become SQL in an editor. It is less direct, but the dev sees the statement and can adjust it, such as adding a `DEFAULT`, and everything goes through the safeguards of `executeQuery` without duplicating rules.

### Internationalization

English messages are the keys: each English text is its own catalog key, and the code calls `l10n.t('Message {0}', value)`. The module is small and lives in `domain/i18n`, so any layer can use it without depending on VS Code.

`activate()` loads `vscode.l10n.bundle` into that module. The official `@vscode/l10n` library must not run in the main process, and the bundle is only guaranteed once activation runs. `renderWebviewHtml` passes the bundle to the webviews through a `data-l10n` attribute and sets `<html lang>`. Each webview bundle, including the lazily loaded chart bundle, configures its own copy of the module.

Without a catalog, the module returns English, which is what the MCP server uses.

### Own Docker client instead of dockerode

The extension only needs to list containers and read each one's configuration. An HTTP client over the socket (or named pipe on Windows) does that in a few lines, keeps the package small and avoids native dependencies such as `ssh2`, which cause trouble in Electron.

### Credentials from the container variables

The official images create the database with variables such as `POSTGRES_PASSWORD` and `MYSQL_ROOT_PASSWORD`. Reading those variables through the Docker API is what makes the connection automatic. When the password comes from a secret file (`*_FILE`), it is not reachable from outside the container, so the extension asks for the password once and saves it in `SecretStorage`.

The password saved by the user takes priority over the container variable, to cover the case where the password was changed after the database was created.

### Two layers of write protection

`classifyQuery` analyzes the SQL before sending it (ignoring strings, quoted identifiers and comments) and classifies it as read, write or destructive. Since a textual analysis does not see side effects inside functions, read-only mode is also enforced by the database itself with `SET SESSION ... READ ONLY`. The MCP server always uses both layers.

### One statement at a time

The file is split by our own scanner and each statement goes to the database separately, instead of sending the whole text to the driver. This gives one result per statement on both databases and avoids turning on `multipleStatements` in MySQL, which would increase the injection risk. The cost is that loose statements do not form an implicit transaction; whoever needs that writes `BEGIN` and `COMMIT`, which work because the session is the same.

The scanner knows the dialect. `#` is only a comment in MySQL, and the backslash only escapes quotes in MySQL and in Postgres `E''` strings. Without that, a string like `'C:\'` would hide the next statement from the risk classification.

### Row limit on the server

Loading everything and cutting afterward consumes extension host memory on an unfiltered `SELECT *`. In Postgres, a cursor (`pg-cursor`) reads only `maxRows + 1` rows. In MySQL, `sql_select_limit` plays the same role, and the three calls (set, query, restore) are queued together on the connection so that no metadata read falls in the middle and comes back truncated. An explicit `LIMIT` in the query takes priority over `sql_select_limit`, so that case still loads what was asked for before cutting.

### Rows as arrays

Rows indexed by column name lose data in `SELECT a.id, b.id`. That is why the adapters ask the drivers for arrays. Whoever needs objects, such as the JSON export and the MCP, disambiguates the names with `uniqueColumnNames`.

Dates arrive as the text the database returned. Converting to `Date` would shift values without a time zone depending on the machine's time zone.

### Connection per file

The global active connection makes sense for the tree, but it is dangerous for running SQL: with two tabs open, `Ctrl+Enter` would go to the last selected database. Each file stores the connection `key` on its first run. The `key` uses the container name, not the id, because the id changes when the container is recreated, and has a prefix per origin (`docker:` or `saved:`), because a saved connection may have the same name as a container. If the connection disappears, the extension asks for another instead of falling back to the active connection.

### Connection sources

`ConnectionManager` receives a list of `ConnectionSource` and does not know where the connections come from. A source's failure is recorded on it and does not bring down the others: with Docker stopped, saved connections keep working. Docker being unavailable is not an error for someone who does not use Docker, so the tree only shows the warning when `auraDataDockDb.dockerHost` is set. In other cases it goes to the log.

Only Docker connections become active on their own. If a remote connection became active when VS Code opened, a `Ctrl+Enter` in a new file could go to production with no choice from the user.

### Saved connections outside the workspace

Connections live in a setting with `scope: machine`, which only applies in user settings. A `.vscode/settings.json` from a cloned repository cannot add connections, and the data does not go to Settings Sync. Passwords live only in `SecretStorage`, and the form never receives them back: an empty field when editing means keep the current password.

The MCP server keeps only the Docker source, so agents do not gain access to remote databases without an explicit decision.

### Tunnel with the system ssh

The tunnel runs `ssh -N -L` instead of using the `ssh2` library, which has native dependencies that cause trouble in Electron. That way the user's `~/.ssh/config`, keys, agent, `known_hosts` and `ProxyJump` apply, without reimplementing anything. The cost is not accepting passwords, because `BatchMode=yes` prevents prompts: without a terminal, there would be nowhere to answer.

An unknown host fails, with guidance to connect once from the terminal. Accepting the key automatically would open the door to interception.

The process is started without a shell, and host, user and jump host starting with `-` are rejected in validation and again in `buildSshArgs`, because a value like `-oProxyCommand=...` would run a command on the user's machine.

`TunneledAdapter` is a `DatabaseAdapter` decorator: it closes the tunnel on `dispose` and turns a tunnel drop into `onDisconnect`. The adapters do not know there is a tunnel, and the `ConnectionManager` reconnects on next use as in any drop. Export and cancellation open their own connections, which go through the same tunnel because they use the same host and port.

With `verified` TLS over a tunnel, the connection is to `127.0.0.1`, but the certificate belongs to the database. Postgres validates against the real host through `servername`. `mysql2` does not allow setting that name, so MySQL validates the chain but not the name.

### Batch introspection

`readSchema` reads columns, constraints and indexes of a whole schema in a few queries, instead of one per table. In Postgres it uses `pg_catalog`, because `information_schema` does not report the full type (`character varying(120)`, `text[]`) or the index definition. The result goes into the `SchemaCache`, which serves the tree, the diagram, the autocomplete and the export, expires after two minutes and is invalidated on manual refresh and after any statement that is not a read.

### DDL from the catalog

The DDL is generated from the same model on both databases, instead of using `SHOW CREATE TABLE`, which only exists in MySQL. Foreign keys come out as `ALTER TABLE` after all the tables, which avoids ordering by dependency and works with cycles. The integration test recreates the schema in an empty database and compares the result with the original.

### Diagram without a layout library

The layout is our own for the same reason as the Docker client: what is needed fits in a small, testable module, with no dependency. Tables are distributed into columns by foreign key depth, with parents on the left. Each parent is pulled close to its children, so the line does not cross other tables, and the order within the column comes from the barycenter method.

`renderDiagramSvg` generates the SVG as text and receives the palette as a parameter. The screen uses VS Code theme variables and the export uses a fixed light palette, which guarantees the exported image has the same drawing as the screen. Long lines can still pass behind tables in dense schemas, and dragging the tables fixes it.

### MCP server in a separate process

The MCP server is built as a bundle of its own (`dist/mcp-server.js`) so any MCP client can start it with `node`. Inside VS Code it runs with the editor's own executable and the `ELECTRON_RUN_AS_NODE=1` variable, so the user does not need Node installed. Since that process has no access to `SecretStorage`, it only sees databases whose password is in the container variables.

The process's standard output is reserved for the protocol, so logs go to `stderr`.

### AI with the model the user already has

`application/ai` defines a single contract (`AiProvider`) with four implementations. The default uses the VS Code models API, which takes advantage of the Copilot subscription without an API key. Since that API does not exist in derived editors such as Cursor, the providers with their own key and Ollama guarantee that AI works anywhere.

The VS Code models API has no system role, so the instructions go together with the user's first message.

Only the schema is sent to the model, never the content of the rows.
