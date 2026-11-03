# Aura DataDock

Extensão open source para VS Code que encontra os bancos de dados rodando em containers Docker e conecta sem nenhuma configuração. Ela lê as credenciais que a própria imagem usa para criar o banco, mostra schemas, tabelas e colunas na barra lateral, executa queries e entrega o schema para a IA que você já usa.

## Recursos

- **Descoberta automática**: detecta containers de Postgres, MySQL e MariaDB (incluindo PostGIS, TimescaleDB e pgvector) e lê usuário, senha e banco das variáveis de ambiente do container.
- **Explorador na barra lateral**: container, schema, tabelas e colunas, com chave primária e tipo de cada coluna.
- **Editor de queries**: `Ctrl+Enter` executa a seleção ou o arquivo inteiro e o resultado aparece em uma grade ao lado.
- **Proteções**: modo somente leitura, confirmação antes de `DROP`, `TRUNCATE`, `ALTER` e de `DELETE` ou `UPDATE` sem `WHERE`.
- **IA para gerar SQL**: descreva o que precisa e a extensão escreve a query a partir do schema real. Funciona com os modelos do VS Code (GitHub Copilot), Anthropic, OpenAI ou Ollama local.
- **Servidor MCP somente leitura**: agentes como o modo agente do VS Code, Claude Code e Cursor conseguem listar bancos, ler o schema e rodar consultas de leitura.

## Requisitos

- VS Code 1.101 ou superior
- Docker em execução (Docker Desktop, Docker Engine, Colima ou Podman com socket compatível)
- A porta do banco publicada para o host, por exemplo `-p 5432:5432`

## Como usar

1. Suba um banco em container, por exemplo com o `docker-compose.dev.yml` deste repositório:
   ```bash
   docker compose -f docker-compose.dev.yml up -d
   ```
2. Abra a aba **Aura DataDock** na barra de atividades. Os containers aparecem automaticamente e a lista se atualiza a cada 15 segundos.
3. Clique em uma tabela para ver os dados, ou use **New Query** no container para abrir um editor SQL.
4. Use **Generate SQL with AI** no topo da aba para escrever uma query em linguagem natural.

Se a senha do container vier de um arquivo de secret (`POSTGRES_PASSWORD_FILE`, por exemplo), a extensão pede a senha uma vez e guarda no cofre do sistema operacional.

## Configurações

| Configuração | Padrão | Descrição |
| --- | --- | --- |
| `auraDataDock.readOnly` | `false` | Bloqueia qualquer comando de escrita, na extensão e na própria sessão do banco |
| `auraDataDock.confirmDestructiveQueries` | `true` | Pede confirmação antes de comandos destrutivos |
| `auraDataDock.maxRows` | `500` | Limite de linhas exibidas no resultado |
| `auraDataDock.dockerHost` | vazio | Endpoint do Docker; vazio usa `DOCKER_HOST` ou o padrão do sistema |
| `auraDataDock.ai.provider` | `vscode` | `vscode`, `anthropic`, `openai` ou `ollama` |
| `auraDataDock.ai.model` | vazio | Modelo do provedor; vazio usa o padrão |
| `auraDataDock.ai.ollamaUrl` | `http://localhost:11434` | Endereço do Ollama |
| `auraDataDock.mcp.enabled` | `true` | Expõe os bancos para agentes via MCP |

Chaves de API são salvas com o comando **Aura DataDock: Set AI Provider API Key** e ficam no cofre do sistema, nunca no `settings.json`.

## Privacidade

- Para gerar SQL, só a estrutura do banco (tabelas, colunas e tipos) é enviada ao modelo. Dados das linhas nunca saem da sua máquina.
- Com o provedor `ollama`, nada sai da sua máquina.
- A extensão não coleta telemetria.

## Usando o servidor MCP fora do VS Code

No VS Code o servidor é registrado automaticamente. Para usar em outros clientes, aponte para o arquivo `dist/mcp-server.js` da extensão instalada. Exemplo com Claude Code no Windows:

```bash
claude mcp add aura-datadock -- node "%USERPROFILE%\.vscode\extensions\lucascodev.aura-datadock-0.1.0\dist\mcp-server.js"
```

Ferramentas disponíveis:

| Ferramenta | O que faz |
| --- | --- |
| `list_databases` | Lista os bancos encontrados nos containers e se podem ser consultados |
| `describe_schema` | Retorna tabelas e colunas de um banco |
| `run_query` | Executa uma consulta de leitura e devolve as linhas em JSON |

O servidor recusa qualquer comando de escrita e ainda abre a sessão do banco em modo somente leitura.

## Desenvolvimento

```bash
npm install
npm run watch
```

Depois pressione `F5` no VS Code para abrir uma janela com a extensão carregada. Outros comandos:

| Comando | Descrição |
| --- | --- |
| `npm run build` | Gera `dist/extension.js` e `dist/mcp-server.js` com esbuild |
| `npm run typecheck` | Verifica os tipos com TypeScript |
| `npm test` | Roda os testes com Vitest |
| `npm run package` | Gera o arquivo `.vsix` |

A organização do código está explicada em [docs/arquitetura.md](docs/arquitetura.md) e o passo a passo para contribuir em [CONTRIBUTING.md](CONTRIBUTING.md).

## Licença

[MIT](LICENSE)
