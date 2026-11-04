# Changelog

[English](CHANGELOG.md) | **Português (Brasil)**

Todas as mudanças relevantes deste projeto são registradas aqui. O formato segue o [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/) e as versões seguem o [Versionamento Semântico](https://semver.org/lang/pt-BR/).

## [Não lançado]

### Adicionado

- Interface e documentação em inglês e em português do Brasil.
- `THIRD_PARTY_NOTICES.md`, com as licenças dos pacotes incluídos na extensão, gerado a cada build de produção a partir do que entra nos bundles.
- Seção **DB Schema**, com schemas, tabelas, colunas, índices e chaves estrangeiras da conexão selecionada, filtro de tabelas e ações por menu.
- Editor de dados: editar células, adicionar e excluir linhas, filtros, ordenação, paginação no servidor e preview do SQL, com gravação em transação.
- Tela de tabela com as abas **Properties** (colunas, índices, referências nos dois sentidos e DDL), **Data** e **Diagram** (a tabela e seus vizinhos diretos).
- Na aba **Data**: filtro por expressão SQL com `Ctrl+Space`, menu por coluna, largura ajustável, navegação por teclado, seleção de várias linhas, duplicar linhas, modos Grid, Text e Record, e painel **Value**.
- **Show SQL** abre o `SELECT` da tela embaixo da grade, para editar e rodar. Uma leitura mostra o resultado na própria grade; o resto segue as proteções de uma query normal.
- **Export data** exporta todas as linhas que atendem aos filtros da tela, em lotes.
- Ações de estrutura que geram o SQL para revisar e rodar: criar tabela, adicionar, renomear e remover coluna, renomear, esvaziar e remover tabela, e criar índice.
- MariaDB como driver próprio, e seletor de driver no formulário de conexão.
- Conexões salvas, além dos containers: bancos locais ou remotos, com formulário, connection string e teste de conexão.
- TLS por conexão, nos modos desligado, obrigatório e verificado, com arquivo de CA.
- Túnel SSH pelo `ssh` do sistema, com reconexão automática.
- Somente leitura por conexão e confirmação de qualquer escrita em banco remoto.
- **Add New Connection** na tela inicial e ações no topo da view: nova conexão, novo SQL, atualizar e recolher tudo.
- Comando **Disconnect** para fechar a conexão com um banco.
- Diagrama ER / MER interativo com notação pé-de-galinha, cardinalidade derivada das constraints e os níveis todas as colunas, só chaves e só entidades.
- Export do diagrama em SVG e PNG, e do schema em DDL, Mermaid, DBML e JSON.
- Export de resultados em CSV, JSON, NDJSON, Markdown e SQL `INSERT`, em arquivo ou para a área de transferência.
- Export de tabela inteira em lotes, com progresso e cancelamento.
- Grade de resultados com uma aba por comando, ordenação, filtro, cópia e rolagem virtual.
- Gráficos sobre o resultado das queries: linha, área, barras, pizza, dispersão com regressão linear, histograma, boxplot e heatmap, com sugestão automática, avisos sobre dados parciais e export em PNG e SVG.
- Execução do comando sob o cursor, do arquivo inteiro (`Ctrl+Shift+Enter`), `EXPLAIN` e ações acima de cada comando no editor.
- Cancelamento de query em execução.
- Autocomplete de tabelas e colunas, com resolução de alias.
- Histórico de queries na barra lateral.
- Chaves estrangeiras no explorador, na ferramenta `describe_schema` do MCP e no contexto enviado à IA.
- Testes de integração dos adapters contra bancos reais (`npm run test:integration`).

### Alterado

- As configurações que escolhem onde a extensão conecta ou envia dados só valem nas configurações de usuário, e um repositório não consegue mais desligar `readOnly` nem `confirmDestructiveQueries`.
- O servidor MCP vem desligado por padrão. A extensão não roda em workspaces não confiáveis.
- O modo somente leitura ficou mais rígido: comentários condicionais contam como SQL, funções que agem no servidor contam como escrita e, no Postgres, cada leitura roda em uma transação somente leitura.
- As senhas salvas de um container pertencem ao endpoint Docker dele, e um container publicado em outra máquina conta como remoto.
- Os exports em CSV neutralizam células de texto que uma planilha executaria como fórmula.
- Bancos são descritos em um registro de drivers, para que adicionar um novo não exija mexer no resto do código.
- Código reorganizado em camadas (`domain`, `drivers`, `application`, `infrastructure`, `presentation` e `main`) e em subpastas por assunto, com testes que impedem dependências para fora e pastas lotadas.
- Clicar em uma tabela abre o editor de dados, e clicar em uma conexão a seleciona em vez de expandi-la.
- O Docker deixa de ser obrigatório. Sem ele, a extensão continua funcionando com as conexões salvas.
- A view **Containers** agora se chama **Connections**.
- O refresh automático só atualiza a árvore quando a lista de conexões mudou.
- `Ctrl+Enter` sem seleção agora executa o comando sob o cursor, e não mais o arquivo inteiro.
- Vários comandos no mesmo envio agora rodam em sequência, cada um confirmado separadamente e com seu próprio resultado.
- Cada arquivo SQL fica ligado ao banco em que foi executado pela primeira vez, em vez de seguir a conexão ativa global.
- A ferramenta `run_query` do MCP aceita um comando por vez.

### Corrigido

- `BIGINT` acima de 2^53 perdia precisão no MySQL e no MariaDB.
- Alterar `auraDataDockDb.dockerHost` só tinha efeito depois de reiniciar o VS Code.
- Com arquivos de containers diferentes abertos, uma query podia rodar no banco errado.
- Colunas com o mesmo nome, como em `SELECT a.id, b.id`, mostravam o mesmo valor.
- Parar um container com conexão aberta podia derrubar o extension host, e a conexão morta continuava em uso.
- Vários comandos no mesmo envio falhavam no MySQL e mostravam só o último resultado no Postgres.
- `SELECT` em tabela grande carregava todas as linhas na memória antes de aplicar o limite.
- Datas sem fuso no Postgres apareciam deslocadas, convertidas para UTC.
- Colunas apareciam com tipos genéricos como `ARRAY` e `USER-DEFINED` no Postgres.
- A análise de SQL não respeitava o dialeto: no Postgres, um `#` de operador JSON ou uma barra invertida em string podia esconder um comando seguinte da classificação de risco.

## [0.1.0]

### Adicionado

- Descoberta automática de containers Postgres, MySQL e MariaDB com leitura das credenciais do container.
- Explorador de schemas, tabelas e colunas na barra lateral.
- Editor de queries com execução por `Ctrl+Enter` e painel de resultados.
- Modo somente leitura e confirmação de comandos destrutivos.
- Geração de SQL com IA via modelos do VS Code, Anthropic, OpenAI ou Ollama.
- Servidor MCP somente leitura com as ferramentas `list_databases`, `describe_schema` e `run_query`.
