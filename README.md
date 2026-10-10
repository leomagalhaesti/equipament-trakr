# Controle T.I.

Aplicação web para controle de estoque, preparação, conferência e retorno de equipamentos de TI.

> **AVISO: PROTÓTIPO BÁSICO DE TESTE.** Não é o sistema oficial e não deve ser usado como fonte única dos registros de estoque.
>
> Os dados que acompanham o código (localidades, cronograma e kits) são fictícios e servem apenas para demonstração.

## Origem e objetivo

Este projeto é um piloto inicial, criado para apoiar temporariamente o controle dos equipamentos que chegam e saem do Centro de Distribuição. Em períodos de alta demanda, parte da conferência é feita manualmente antes do lançamento no sistema oficial, e nem sempre há tempo para concluir todas as conferências e registros.

A proposta é começar a coletar e organizar esses dados de forma mais consistente, como apoio temporário e emergencial ao fluxo existente. Em paralelo, está em desenvolvimento uma iniciativa de identificação por etiquetas e RFID; este piloto não inclui leitor RFID nem integração com esse sistema.

## Autoria

Concebido e desenvolvido por [Leonardo Antônio Magalhães Gonçalves](https://github.com/leomagalhaesti).

## Requisitos

- Node.js 20.19 ou superior
- npm

## Desenvolvimento

```sh
npm ci
npm run dev
```

## Publicação

```sh
npm run build
```

O build gera os arquivos estáticos em `dist/`. Publique o conteúdo dessa pasta em um diretório web do servidor GLPI. O pacote não precisa de Node.js em produção e pode ser hospedado em subdiretório; a navegação usa hash para dispensar regras de reescrita de URL.

Esta entrega é uma aplicação web estática independente, não um plugin GLPI. Os dados são armazenados localmente no navegador e ainda não são integrados à autenticação, às permissões ou ao banco de dados do GLPI.
