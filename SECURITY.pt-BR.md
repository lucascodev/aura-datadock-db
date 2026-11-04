# Política de segurança

[English](SECURITY.md) | **Português (Brasil)**

## Como relatar uma vulnerabilidade

Não abra uma issue pública. [Faça o relato em privado no GitHub](https://github.com/lucascodev/aura-datadock-db/security/advisories/new), para que só o mantenedor veja o problema até existir uma correção.

Inclua o que puder do seguinte:

- A versão afetada e o seu sistema operacional
- Os passos para reproduzir o problema
- O que alguém mal-intencionado conseguiria fazer com ele

Nunca envie senhas reais, tokens ou dados de produção em um relato.

## Versões com suporte

Só a versão publicada mais recente recebe correções de segurança.

## O que acontece depois

Este projeto é mantido por uma pessoa, então as respostas dependem da disponibilidade. Um problema confirmado é corrigido em uma nova versão, e o relato pode se tornar público depois disso. Diga no relato se quiser receber crédito.

## Escopo

Relatos sobre a extensão e o servidor MCP são bem-vindos, como um repositório que enfraquece uma proteção, um jeito de burlar o modo somente leitura ou um vazamento de credenciais salvas.

A [seção de segurança do README](README.pt-BR.md#segurança) lista os limites conhecidos, como o modo TLS **Obrigatório** não validar certificados. Problemas em uma dependência também são bem-vindos se afetarem esta extensão.
