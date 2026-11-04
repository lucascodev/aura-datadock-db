# Arquitetura

[English](architecture.md) | **Português (Brasil)**

O código segue camadas com dependências apontando só para dentro. O domínio e as regras não conhecem o VS Code, o banco nem o navegador. Por isso o servidor MCP, que roda como processo separado, reaproveita exatamente a mesma lógica da extensão, e as regras são testadas sem subir nada.

```
domain  ←  drivers  ←  application  ←  infrastructure
                                   ←  presentation
                                            ↑
                                   main (conhece todas)
```

## Camadas

```
src/
  domain/           Tipos e contratos puros
    connection/       Alvos de conexão, TLS, SSH e credenciais
    database/         DatabaseAdapter, statements e resultados
    driver/           Contrato de um driver e dialeto SQL
    i18n/             Tradução de mensagens, sem depender do VS Code
    schema/           Tabelas, colunas, índices e chaves
  drivers/          Catálogo de bancos, puro: nenhuma conexão acontece aqui
    catalog/          Busca no catálogo e quoting de identificadores
    postgres/, mysql/, mariadb/   Descrição e dialeto de cada banco
  application/      Regras e casos de uso, sem bibliotecas externas
    ai/               Contrato de provedor e montagem do prompt
    charts/           Tipos de coluna, sugestão, dados de cada gráfico e estatística
    completion/       Sugestões de autocomplete
    connections/      Ciclo de vida, conexões salvas e orientações de erro e proteção
    diagram/          Modelo, layout e SVG do diagrama
    editing/          Alterações pendentes, navegação na tabela e mudanças de estrutura
    export/           Encoders de linhas e catálogo de formatos
    format/           Formatação de valores e nomes
    query/            Análise de SQL, execução, histórico e ligação arquivo-banco
    schema/           Leitura, relacionamentos e renderização em DDL, Mermaid e DBML
    sql/              Literais, quoting condicional e templates de statement
  infrastructure/   Implementações que falam com o mundo externo
    ai/               Anthropic, OpenAI e Ollama
    database/         Um DatabaseAdapter por protocolo, e a fábrica que os escolhe
    docker/           Cliente do Docker Engine e descoberta de containers
    ssh/              Túnel pelo ssh do sistema e o decorator TunneledAdapter
  presentation/     O que o usuário vê e usa
    contracts/        Mensagens tipadas entre a extensão e as webviews
    vscode/           Comandos, TreeViews, painéis, CodeLens e autocomplete
    webview/          Código que roda no navegador, sem acesso a Node nem ao VS Code
  main/             Composição: cria as dependências e liga tudo
    extension.ts      Entrada da extensão
    mcpServer.ts      Entrada do servidor MCP
    createAiProvider.ts   Escolhe o provedor de IA pela configuração
```

## Regras

| Camada | Pode importar | Bibliotecas externas |
|---|---|---|
| `domain` | nada | nenhuma |
| `drivers` | `domain` | nenhuma |
| `application` | `domain`, `drivers` | nenhuma |
| `infrastructure` | `domain`, `drivers`, `application` | `pg`, `mysql2`, `node:*` |
| `presentation/contracts` | `domain`, `application` | nenhuma |
| `presentation/webview` | `domain`, `drivers`, `application`, `contracts` | nenhuma, salvo `echarts` em `chart/echarts/` |
| `presentation/vscode` | `domain`, `drivers`, `application`, `contracts` | `vscode`, `node:*` |
| `main` | todas | todas |

Nas pastas:

- Uma pasta tem arquivos ou subpastas, nunca os dois. A única exceção é o `main.ts` de cada webview, que é o ponto de entrada do bundle.
- No máximo 8 arquivos por pasta. Ao passar disso, separe por assunto.

Dentro de uma camada, as pastas seguem contexto e depois tipo. `application/query/model/` guarda contratos, `ports/` guarda interfaces para o lado de fora, na camada que as declara, `errors/` guarda classes de erro e `constants/` guarda dados compartilhados. As demais pastas têm nome de assunto, como `analysis/`, e guardam lógica. A camada vem primeiro para que o caminho mostre quem pode depender de quem, e o contexto vem antes do tipo para que a mudança em um assunto fique em um só lugar.

Um arquivo que exporta uma função ou uma classe não exporta tipos: um tipo usado em outro lugar tem arquivo próprio, e um tipo usado só no próprio arquivo fica privado. Cada classe de erro tem um arquivo com o nome dela. Uma constante usada em um arquivo fica perto do uso, e a compartilhada por vários arquivos vai para `constants/`, para que a mesma informação tenha uma única origem.

Um arquivo exporta uma função, com o nome do arquivo, para que o caminho diga o que ela faz. As exceções são `main/extension.ts`, porque o VS Code espera `activate` e `deactivate` juntos, e o módulo de tradução, em que `l10n` e `useL10nCatalog` compartilham o catálogo ativo.

Os testes em `test/architecture/` leem os imports de todo o `src` e falham se alguma dessas regras for quebrada, inclusive em `import type`, porque um tipo importado também acopla.

Quando a camada de dentro precisa de algo de fora, ela recebe por injeção, e só o `main` conhece a implementação. O `ConnectionManager` recebe `openAdapter`, o `ConnectionFormPanel` também, e os comandos pedem o provedor de IA por `DataDockContext.createAiProvider`.

`drivers` é uma camada própria porque é consultada por quase tudo, inclusive pelo navegador, para saber o dialeto ou preencher o formulário. Ele só descreve os bancos. As fábricas de adapter, que levam `pg` e `mysql2`, ficam em `infrastructure/database/factory`, para não entrarem no bundle das webviews.

`VsCodeLmProvider` fica em `presentation/vscode` mesmo sendo um provedor de IA, porque depende da API do VS Code. Assim, `vscode` só aparece em `presentation/vscode` e em `main`.

As webviews falam com a extensão só por mensagens, tipadas em `presentation/contracts`, e têm um `tsconfig` próprio com a biblioteca `DOM`.

Os testes ficam em `test/unit`, na mesma árvore de `src`, e em `test/integration`, contra bancos reais.

## Decisões

### Registro de drivers

Tudo o que muda de um banco para outro fica em `drivers/` e em `infrastructure/database/`. A descrição (`DriverDescriptor`) é pura e reúne porta padrão, esquemas de connection string, descoberta no Docker e dialeto SQL. As fábricas de adapter ficam em `infrastructure/database/factory`, para que as webviews possam ler a descrição sem levar `pg` e `mysql2` no bundle. `application` e `presentation` só perguntam ao catálogo, nunca comparam ids. Um teste de arquitetura falha se isso voltar a acontecer, e outro registra um driver falso e o exercita em toda a cadeia.

`DriverId` é uma string, e não uma união fechada: o catálogo é a fonte da verdade, e ids desconhecidos são recusados na borda, ao ler as conexões salvas.

Driver e adapter são coisas separadas porque MySQL e MariaDB falam o mesmo protocolo: são dois drivers com um adapter só. Um banco baseado em arquivo, como o SQLite, ainda precisaria de um formulário sem host e porta.

### Edição de dados

As alterações ficam pendentes na webview como uma lista de `RowChange`, e só viram SQL na extensão. A webview pode pedir qualquer coisa, por isso `buildRowChangeStatements` confere de novo se a tabela permite a operação e se as colunas existem e podem ser alteradas.

Valores sempre vão como parâmetros. Cada statement guarda também um `preview` com literais, só para leitura, montado das mesmas partes em vez de substituir placeholders no texto, o que quebraria com um `?` dentro de uma string.

A gravação usa uma conexão dedicada, para a transação não se misturar com as outras consultas da conexão principal. Ela herda o modo somente leitura da sessão, então o banco recusa a escrita mesmo se a checagem da extensão falhar. Cada alteração precisa afetar exatamente uma linha; caso contrário, a transação inteira é desfeita.

O editor lê os valores como o texto que o banco devolve, em vez de deixar o driver converter. Assim um array continua como `{a,b}` em vez de virar JSON, e o que o dev edita é o formato que o banco aceita de volta. No MySQL, `supportBigNumbers` evita que um `BIGINT` perca precisão, o que faria um `UPDATE` atingir outra linha.

O VS Code não permite impedir o fechamento de uma webview. Por isso a extensão guarda as alterações pendentes e, se a aba fechar com alguma, oferece reabrir com elas.

### Tela de tabela

O estado da aba Data fica em `presentation/webview/table/data/state/DataTabState.ts`, sem DOM e testado com Vitest. Os componentes (`DataGrid`, `FilterBar`, `BottomBar`, `ValuePanel`, `RecordView`, `SqlPanel`) só desenham esse estado e avisam o `main.ts`. Selecionar uma célula troca uma classe em vez de redesenhar a grade: redesenhar no primeiro clique destruiria a célula e o duplo clique nunca abriria a edição. Pelo mesmo motivo, a seleção acontece no `mousedown`, antes de o `blur` da edição aberta salvar e redesenhar.

A expressão de filtro é o único SQL escrito à mão nesta tela, e tem três barreiras:

1. `validateWhereExpression` usa `classifyQuery` para exigir um único comando de leitura. É análise de texto, e não enxerga uma função com efeito colateral.
2. A expressão entra entre parênteses e em linhas próprias, para um `--` não comentar o resto da consulta.
3. O banco executa só um comando por chamada. No MySQL e no MariaDB isso vem de `execute`, com prepared statement. No Postgres, o `pg` usa o protocolo simples, que aceita vários comandos, quando a consulta não tem parâmetros; por isso `queryPage` e `applyStatements` forçam `queryMode: 'extended'`. Um teste de integração executa `SELECT ...; DELETE ...` direto no adapter e confere que nenhuma linha sumiu.

O SQL do painel embaixo da grade segue outro caminho. Um único comando de leitura vai para `runQuery` e aparece na grade, sem edição, porque um resultado arbitrário não tem como identificar a linha de origem. O resto vai para `executeQuery`, que aplica as mesmas confirmações do editor e devolve se chegou a executar, para a tela não afirmar nada quando a confirmação é recusada.

### Gráficos

Da query ao desenho, o caminho é `linhas → tipos de coluna → sugestão → ChartConfig → buildChartData → ChartData → toEChartsOption → ECharts`. Até `ChartData`, tudo fica em `application/charts`, puro e testado sem navegador. O ECharts só aparece em `presentation/webview/chart/echarts`, atrás do contrato `ChartRenderer`; um teste de arquitetura impede que ele vaze dali. Se outra biblioteca for necessária, ela implementa esse contrato.

Histograma, boxplot e regressão linear são calculados aqui, em `application/charts/statistics`, e não pelo `echarts-stat`, que está sem atualização desde 2022. O histograma escolhe as faixas por Freedman-Diaconis, com Sturges quando o intervalo interquartil é zero. Os quartis usam interpolação linear, e os outliers ficam além de 1,5 vez esse intervalo.

A CSP das webviews proíbe atributos `style` inline, e o tooltip padrão do ECharts monta HTML com eles: foram 21 violações na prova técnica. Por isso o tooltip recebe elementos criados por código em `createTooltipContent`, e a CSP não precisou ser afrouxada.

O ECharts pesa cerca de 680 KB minificado, então vai em um bundle próprio, `dist/webview/chart.js`. Ele só carrega ao abrir a visão Chart, em uma tag `<script>` com o nonce da página, cujo endereço vem em `data-chart-script`.

Datas são lidas como foram escritas, sem aplicar o deslocamento de fuso, e o eixo usa UTC só para não converter de novo. Assim o gráfico mostra o mesmo valor da grade, e um `date_trunc` não cai no dia anterior para quem está em outro fuso.

Um gráfico engana com mais facilidade que uma tabela. Por isso o que muda o desenho vira um `ChartNotice` visível: resultado cortado, linhas sem valor, somas, séries agrupadas em Other e inteiros aproximados. A paleta é fixa e validada para daltonismo nas superfícies padrão do VS Code; as cores `charts-*` do tema não têm essa garantia. Pelo mesmo motivo, há um único eixo Y, no máximo 8 séries, ou 3 na dispersão, e a pizza nunca é sugerida automaticamente.

### Internacionalização

As mensagens em inglês são as chaves: cada texto em inglês é a própria chave do catálogo, e o código chama `l10n.t('Message {0}', value)`. O módulo é pequeno e fica em `domain/i18n`, para que qualquer camada o use sem depender do VS Code.

O `activate()` carrega o `vscode.l10n.bundle` nesse módulo. A biblioteca oficial `@vscode/l10n` não pode rodar no processo principal, e o bundle só é garantido depois que a ativação roda. O `renderWebviewHtml` entrega o bundle às webviews por um atributo `data-l10n` e define o `<html lang>`. Cada bundle de webview, inclusive o do gráfico, que é carregado sob demanda, configura a sua própria cópia do módulo.

Sem catálogo, o módulo devolve o inglês, que é o que o servidor MCP usa.

### Estrutura gerada para revisão

Mudanças de estrutura não são executadas pela interface: viram SQL em um editor. É menos direto, mas o dev vê o comando e pode ajustá-lo, como acrescentar um `DEFAULT`, e tudo passa pelas proteções de `executeQuery` sem duplicar regras.

### Cliente Docker próprio em vez de dockerode

A extensão só precisa listar containers e ler a configuração de cada um. Um cliente HTTP sobre o socket (ou named pipe no Windows) resolve isso em poucas linhas, mantém o pacote pequeno e evita dependências nativas como `ssh2`, que dão problema no Electron.

### Credenciais a partir das variáveis do container

As imagens oficiais criam o banco com variáveis como `POSTGRES_PASSWORD` e `MYSQL_ROOT_PASSWORD`. Ler essas variáveis pela API do Docker é o que torna a conexão automática. Quando a senha vem de um arquivo de secret (`*_FILE`), ela não é acessível de fora do container, então a extensão pede a senha uma vez e salva no `SecretStorage`.

A senha salva pelo usuário tem prioridade sobre a variável do container, para cobrir o caso em que a senha foi alterada depois da criação do banco.

### Duas camadas de proteção para escrita

`classifyQuery` analisa o SQL antes de enviar (ignorando strings, identificadores entre aspas e comentários) e classifica em leitura, escrita ou destrutivo. Como uma análise textual não enxerga efeitos colaterais dentro de funções, o modo somente leitura também é aplicado pelo próprio banco com `SET SESSION ... READ ONLY`. O servidor MCP usa sempre as duas camadas.

### Um comando por vez

O arquivo é dividido pelo próprio scanner e cada comando vai ao banco separadamente, em vez de enviar o texto inteiro ao driver. Isso dá um resultado por comando nos dois bancos e dispensa ligar `multipleStatements` no MySQL, que aumentaria o risco de injeção. O custo é que comandos soltos não formam uma transação implícita; quem precisa disso escreve `BEGIN` e `COMMIT`, que funcionam porque a sessão é a mesma.

O scanner conhece o dialeto. `#` só é comentário no MySQL e a barra invertida só escapa aspas no MySQL e em strings `E''` do Postgres. Sem isso, uma string como `'C:\'` esconderia o comando seguinte da classificação de risco.

### Limite de linhas no servidor

Carregar tudo e cortar depois consome memória do extension host em um `SELECT *` sem filtro. No Postgres, um cursor (`pg-cursor`) lê só `maxRows + 1` linhas. No MySQL, `sql_select_limit` faz o mesmo papel, e as três chamadas (definir, consultar, restaurar) entram juntas na fila da conexão para que nenhuma leitura de metadados caia no meio e venha truncada. Um `LIMIT` explícito na query tem prioridade sobre `sql_select_limit`, então esse caso ainda carrega o que foi pedido antes de cortar.

### Linhas como arrays

Linhas indexadas por nome de coluna perdem dados em `SELECT a.id, b.id`. Por isso os adapters pedem arrays aos drivers. Quem precisa de objetos, como o export JSON e o MCP, desambigua os nomes com `uniqueColumnNames`.

Datas chegam como o texto que o banco devolveu. Converter para `Date` deslocaria valores sem fuso conforme o fuso da máquina.

### Conexão por arquivo

A conexão ativa global faz sentido para a árvore, mas é perigosa para executar SQL: com duas abas abertas, o `Ctrl+Enter` iria para o último banco selecionado. Cada arquivo guarda a `key` da conexão na primeira execução. A `key` usa o nome do container, e não o id, porque o id muda quando o container é recriado, e tem um prefixo por origem (`docker:` ou `saved:`), porque uma conexão salva pode ter o nome de um container. Se a conexão sumir, a extensão pede outra em vez de cair na conexão ativa.

### Fontes de conexão

`ConnectionManager` recebe uma lista de `ConnectionSource` e não sabe de onde as conexões vêm. A falha de uma fonte fica registrada nela e não derruba as outras: com o Docker parado, as conexões salvas continuam funcionando. Docker indisponível não é um erro para quem não usa Docker, então a árvore só mostra o aviso quando `auraDataDockDb.dockerHost` está configurado. Nos outros casos ele vai para o log.

Só conexões Docker viram ativas sozinhas. Se uma conexão remota virasse a ativa ao abrir o VS Code, um `Ctrl+Enter` num arquivo novo poderia ir para produção sem nenhuma escolha do usuário.

### Conexões salvas fora do workspace

As conexões ficam em uma configuração com `scope: machine`, que só vale nas configurações do usuário. Um `.vscode/settings.json` de um repositório clonado não consegue adicionar conexões, e os dados não vão para o Settings Sync. Senhas ficam só no `SecretStorage`, e o formulário nunca as recebe de volta: campo vazio na edição significa manter a senha atual.

O servidor MCP continua só com a fonte Docker, para que agentes não ganhem acesso a bancos remotos sem uma decisão explícita.

### Túnel com o ssh do sistema

O túnel executa `ssh -N -L` em vez de usar a biblioteca `ssh2`, que tem dependências nativas que dão problema no Electron. Assim valem o `~/.ssh/config`, as chaves, o agente, o `known_hosts` e o `ProxyJump` do usuário, sem reimplementar nada. O custo é não aceitar senha, porque `BatchMode=yes` impede perguntas: sem terminal, não haveria onde responder.

Host desconhecido falha, com orientação para conectar uma vez pelo terminal. Aceitar a chave sozinho abriria espaço para interceptação.

O processo é iniciado sem shell, e host, usuário e jump host iniciados por `-` são recusados na validação e de novo em `buildSshArgs`, porque um valor como `-oProxyCommand=...` executaria um comando na máquina do usuário.

`TunneledAdapter` é um decorator de `DatabaseAdapter`: fecha o túnel no `dispose` e transforma a queda do túnel em `onDisconnect`. Os adapters não sabem que há um túnel, e o `ConnectionManager` reconecta no próximo uso como em qualquer queda. Export e cancelamento abrem conexões próprias, que passam pelo mesmo túnel por usarem o mesmo host e porta.

No TLS `verified` por túnel, a conexão é com `127.0.0.1`, mas o certificado é do banco. O Postgres valida contra o host real por `servername`. O `mysql2` não permite informar esse nome, então o MySQL valida a cadeia, mas não o nome.

### Introspecção em lote

`readSchema` lê colunas, constraints e índices de um schema inteiro em poucas consultas, em vez de uma por tabela. No Postgres usa `pg_catalog`, porque `information_schema` não informa o tipo completo (`character varying(120)`, `text[]`) nem a definição dos índices. O resultado fica no `SchemaCache`, que serve a árvore, o diagrama, o autocomplete e o export, expira em dois minutos e é invalidado no refresh manual e depois de qualquer comando que não seja de leitura.

### DDL a partir do catálogo

O DDL é gerado do mesmo modelo nos dois bancos, em vez de usar `SHOW CREATE TABLE`, que só existe no MySQL. As chaves estrangeiras saem em `ALTER TABLE` depois de todas as tabelas, o que dispensa ordenar por dependência e funciona com ciclos. O teste de integração recria o schema em um banco vazio e compara o resultado com o original.

### Diagrama sem biblioteca de layout

O layout é próprio pelo mesmo motivo do cliente Docker: o necessário cabe em um módulo pequeno e testável, sem dependência. As tabelas são distribuídas em colunas pela profundidade das chaves estrangeiras, com os pais à esquerda. Cada pai é puxado para perto dos filhos, para que a linha não atravesse outras tabelas, e a ordem dentro da coluna vem do método do baricentro.

`renderDiagramSvg` gera o SVG como texto e recebe a paleta como parâmetro. A tela usa variáveis do tema do VS Code e o export usa uma paleta clara fixa, o que garante que a imagem exportada tenha o mesmo desenho da tela. Linhas longas ainda podem passar por trás de tabelas em schemas densos, e arrastar as tabelas resolve.

### Servidor MCP em processo separado

O servidor MCP é gerado como um bundle próprio (`dist/mcp-server.js`) para que qualquer cliente MCP consiga iniciá-lo com `node`. Dentro do VS Code ele roda com o executável do próprio editor e a variável `ELECTRON_RUN_AS_NODE=1`, então o usuário não precisa ter Node instalado. Como esse processo não tem acesso ao `SecretStorage`, ele só enxerga bancos cuja senha está nas variáveis do container.

A saída padrão do processo é reservada ao protocolo, por isso os logs vão para `stderr`.

### Camadas da proteção de somente leitura

O somente leitura tem duas camadas, porque nenhuma basta sozinha. O `classifyQuery` decide antes de enviar: lê como SQL o conteúdo dos comentários condicionais do MySQL e do MariaDB, já que o servidor os executa, e trata como escrita as funções listadas em `serverSideFunctions` de cada dialeto. O banco garante o resto: a sessão é somente leitura e, no Postgres, cada leitura roda em `BEGIN TRANSACTION READ ONLY` seguido de `ROLLBACK`, que também desfaz qualquer configuração que o comando tenha alterado.

A lista de funções não cobre funções criadas por usuários, e superusuários podem ler arquivos do servidor por caminhos que ela não conhece. Por isso a documentação orienta conectar a bancos sensíveis com um usuário limitado.

### IA com o modelo que o usuário já tem

`application/ai` define um contrato único (`AiProvider`) com quatro implementações. A padrão usa a API de modelos do VS Code, que aproveita a assinatura do Copilot sem chave de API. Como essa API não existe em editores derivados como Cursor, os provedores com chave própria e o Ollama garantem que a IA funcione em qualquer lugar.

A API de modelos do VS Code não tem papel de sistema, então as instruções vão junto da primeira mensagem do usuário.

Só o schema é enviado ao modelo, nunca o conteúdo das linhas.
