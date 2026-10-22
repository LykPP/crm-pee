# Painel PEE

CRM web para ESCOs que desenvolvem projetos do Programa de Eficiência Energética
(PEE) da ANEEL: prospecção de clientes, montagem da proposta (documentos e cálculo
de RCB), submissão às chamadas públicas das distribuidoras e execução.

Endereço de teste: https://crm-pee.vercel.app

## Como funciona

| Parte | Ferramenta | Onde |
|---|---|---|
| Telas e servidor | Next.js 15 + TypeScript | Vercel (região São Paulo) |
| Banco de dados e login por e-mail | Supabase (Postgres) | São Paulo |
| Separação entre ESCOs | Row level security no próprio banco | `supabase/migrations/` |
| Regras de negócio (documentos, PEE, RCB, limites, alertas) | Código sem tela, testado | `src/lib/pee/` |
| Regras de cada edital | Dados em JSON validado | tabela `calls.rules`, esquema em `src/lib/calls/rules-schema.ts` |

## Estrutura

| Pasta | Conteúdo |
|---|---|
| `src/app/` | Telas: Início, Projetos, Clientes, Editais, Pipeline, Calendário, Distribuidoras, Equipe |
| `src/lib/pee/` | Cálculos e regras portados do protótipo |
| `src/lib/` | Agenda, notícias, calendário, mensagens prontas, histórico |
| `supabase/migrations/` | Estrutura do banco, aplicada em ordem pelo nome do arquivo |
| `supabase/seed/reference_data.sql` | Distribuidoras e editais de referência (gerado por `npm run seed:reference`) |
| `tests/` | Testes do banco (isolamento e permissões) e comparações com o protótipo e a planilha oficial |
| `prototype/` | Protótipo aprovado e dados de exemplo |
| `docs/` | Especificação, editais da Cemig, planilha oficial de RCB e resumos de fase |
| `scripts/check-official-rcb.py` | Roda os exemplos na planilha oficial da Cemig (requer LibreOffice) |
| `CLAUDE.md` | Contexto e decisões do projeto |

## Rodar no computador

```bash
npm install
cp .env.example .env.local   # preencha com os dados do projeto Supabase
npm run dev                  # http://localhost:3000
npm test                     # testes automáticos
npm run lint
```

## Banco de dados

Num projeto Supabase novo, rode no SQL Editor, nesta ordem, cada arquivo de
`supabase/migrations/` e depois `supabase/seed/reference_data.sql`. Os arquivos
podem ser rodados uma vez cada; o de referência pode ser rodado de novo para
atualizar os editais.

Novas ESCOs só podem ser criadas quando o interruptor do banco estiver ligado
(fase comercial):

```sql
update app_settings set value = 'true' where key = 'allow_new_organizations';
```

Enquanto estiver desligado, as pessoas entram por convite, na tela Equipe.

## Situação

Fase 1 concluída. Resumo, decisões e proposta da Fase 2 em `docs/FASE-1-RESUMO.md`.
