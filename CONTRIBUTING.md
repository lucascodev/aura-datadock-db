# Como contribuir

Obrigado pelo interesse! Issues e pull requests são bem-vindos.

## Preparando o ambiente

```bash
git clone https://github.com/lucascodev/aura-datadock.git
cd aura-datadock
npm install
docker compose -f docker-compose.dev.yml up -d
```

Abra a pasta no VS Code e pressione `F5`. O `docker-compose.dev.yml` sobe um Postgres e um MySQL com tabelas de exemplo para testar.

## Padrões de código

- Código, nomes e mensagens de commit em inglês.
- Clean Code como referência: funções pequenas, nomes que explicam a intenção, um conceito por arquivo.
- Sem comentários no código. Se algo precisa de explicação, prefira um nome melhor ou extraia uma função. Decisões de arquitetura ficam em [docs/arquitetura.md](docs/arquitetura.md).
- O núcleo (`domain`, `docker`, `adapters`, `core`) não importa `vscode`, para continuar utilizável pelo servidor MCP.
- Toda regra nova em `core` ou `docker` vem acompanhada de teste em `test/`.

Antes de abrir o pull request:

```bash
npm run typecheck
npm test
```

## Adicionando um novo banco

1. Inclua o tipo em `src/domain/DatabaseKind.ts`.
2. Crie `src/adapters/<banco>/<Banco>Adapter.ts` implementando `DatabaseAdapter`.
3. Registre o adapter em `src/adapters/createAdapter.ts`.
4. Em `src/docker/detectDatabaseKind.ts`, adicione o padrão de imagem e a porta padrão.
5. Em `src/docker/resolveCredentials.ts`, leia as variáveis de ambiente da imagem oficial.
6. Escreva os testes de detecção e de credenciais.
7. Adicione o banco no `docker-compose.dev.yml` e na lista do README.

## Reportando problemas

Inclua a versão do VS Code, o sistema operacional, como o Docker está instalado (Desktop, Engine, Colima, Podman) e a imagem do banco. A aba **Output > Aura DataDock** mostra os logs da extensão.
