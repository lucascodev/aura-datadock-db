# Arquitetura

O código segue camadas com dependências apontando para dentro: a interface (VS Code, MCP) depende do núcleo, e o núcleo não conhece o VS Code. Isso permite que o servidor MCP, que roda como processo separado, reaproveite exatamente a mesma lógica da extensão.

```
src/
  domain/      Tipos e contratos puros (ConnectionTarget, DatabaseAdapter, QueryResult)
  docker/      Conversa com o Docker Engine e transforma containers em ConnectionTarget
  adapters/    Uma implementação de DatabaseAdapter por banco (postgres, mysql)
  core/        Regras que não dependem de interface: conexões, classificação de queries, descrição de schema
  ai/          Provedores de IA e montagem de prompt
  ui/          TreeView e painel de resultados
  commands/    Um arquivo por comando da extensão
  mcp/         Servidor MCP e seu registro no VS Code
  extension.ts Ponto de composição: cria as dependências e registra tudo
```

## Decisões

### Cliente Docker próprio em vez de dockerode

A extensão só precisa listar containers e ler a configuração de cada um. Um cliente HTTP sobre o socket (ou named pipe no Windows) resolve isso em poucas linhas, mantém o pacote pequeno e evita dependências nativas como `ssh2`, que dão problema no Electron.

### Credenciais a partir das variáveis do container

As imagens oficiais criam o banco com variáveis como `POSTGRES_PASSWORD` e `MYSQL_ROOT_PASSWORD`. Ler essas variáveis pela API do Docker é o que torna a conexão automática. Quando a senha vem de um arquivo de secret (`*_FILE`), ela não é acessível de fora do container, então a extensão pede a senha uma vez e salva no `SecretStorage`.

A senha salva pelo usuário tem prioridade sobre a variável do container, para cobrir o caso em que a senha foi alterada depois da criação do banco.

### Duas camadas de proteção para escrita

`classifyQuery` analisa o SQL antes de enviar (ignorando strings, identificadores entre aspas e comentários) e classifica em leitura, escrita ou destrutivo. Como uma análise textual não enxerga efeitos colaterais dentro de funções, o modo somente leitura também é aplicado pelo próprio banco com `SET SESSION ... READ ONLY`. O servidor MCP usa sempre as duas camadas.

### Resultado do último comando no Postgres

Quando o usuário executa vários comandos de uma vez, o driver `pg` devolve um resultado por comando. A grade mostra o último, que é o que normalmente interessa.

### Servidor MCP em processo separado

O servidor MCP é gerado como um bundle próprio (`dist/mcp-server.js`) para que qualquer cliente MCP consiga iniciá-lo com `node`. Dentro do VS Code ele roda com o executável do próprio editor e a variável `ELECTRON_RUN_AS_NODE=1`, então o usuário não precisa ter Node instalado. Como esse processo não tem acesso ao `SecretStorage`, ele só enxerga bancos cuja senha está nas variáveis do container.

A saída padrão do processo é reservada ao protocolo, por isso os logs vão para `stderr`.

### IA com o modelo que o usuário já tem

A camada `ai/` define um contrato único (`AiProvider`) com quatro implementações. A padrão usa a API de modelos do VS Code, que aproveita a assinatura do Copilot sem chave de API. Como essa API não existe em editores derivados como Cursor, os provedores com chave própria e o Ollama garantem que a IA funcione em qualquer lugar.

A API de modelos do VS Code não tem papel de sistema, então as instruções vão junto da primeira mensagem do usuário.

Só o schema é enviado ao modelo, nunca o conteúdo das linhas.
