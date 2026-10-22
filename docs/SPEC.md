# Especificação da versão 1

## 1. Objetivo
Transformar o protótipo (`prototype/crm-prototipo.html`) em uma aplicação web real,
com login, banco de dados próprio, várias empresas isoladas entre si e pronta para
ser hospedada no nosso domínio.

## 2. Usuários e permissões
| Papel | Pode |
|---|---|
| Administrador da ESCO | tudo, incluindo convidar usuários e editar regras de editais |
| Técnico | criar e editar clientes, projetos, documentos, ações e custos |
| Comercial | clientes, contatos, interações, pipeline; vê projetos sem custos |
| Leitor | só visualiza |

Cada usuário pertence a uma organização (ESCO). Isolamento por organização em
todas as tabelas (row level security no banco).

## 3. Módulos (iguais ao protótipo)
1. **Início**: tarefas do dia (documentos vencidos, contatos atrasados), contagem
   regressiva do edital aberto, cartões dos projetos em andamento.
2. **Projetos**: fases (Prospecção, Preparação, Submissão, Execução, Encerrado) e
   11 etapas; "Próximo passo"; abas Visão geral, Documentos, Viabilidade, Execução.
3. **Clientes**: dados, contatos, próxima ação, histórico, modelos de mensagem.
4. **Editais**: essencial no topo; tipologias, documentos exigidos, regras que
   desclassificam, limites e pontuação em seções recolhíveis.
5. **Pipeline**: quadro em 5 fases.
6. **Distribuidoras**: canais oficiais, pessoas de contato, histórico.

## 4. Modelo de dados (ponto de partida, refinar)
- `organizations`, `users`, `memberships(role)`
- `utilities` (distribuidoras): nome, sigla, UF, site, e-mail PEE, sistema de envio
- `calls` (editais): código, distribuidora, status, publicação, prazo, recurso,
  links, e `rules` (JSONB validado por schema: tipologias, rcbMax, limites, mop,
  custosEvitados, checklist, regras, pontuação, fotosMinimas). Editais podem ser
  globais (mantidos por nós) e copiados por cada organização.
- `clients`, `contacts` (polimórfico: cliente ou distribuidora)
- `projects`: cliente, edital, tipologia, modalidade (fp/cd), nível de tensão,
  município, etapa, flags (meEpp, naoRemovivel, tombado, fonteIncentivada, licitacao),
  pasta OneDrive, responsável, próxima ação
- `consumer_units` (UCs) por projeto
- `project_documents`: chave do item do checklist + UC opcional, status
  (pendente/ok/na), arquivo, emissão, validade, observação
- `efficiency_actions`: campos do formulário de ação do protótipo
- `project_costs`: rubricas (diag, projExec, gerenc, relFinal, motOutros, mkt,
  trein, desc, mv, contrapartida)
- `execution_steps`: etapa, status, início, fim
- `interactions`: tipo, data, resumo, autor, vínculos
- `audit_log`: quem mudou o quê e quando

## 5. Regras de negócio (portar do protótipo, com testes)
- Aplicabilidade de cada documento (`applies`) e escopo por UC.
- Validade: certidão válida no prazo de submissão; fatura até 3 meses antes da
  submissão; orçamento até 3 meses antes da publicação; certidão de imóvel até 30 dias.
- Cálculo (`calc`): energia economizada, redução na ponta (FCP = nup·nd·nm/792),
  MOP, ADMP, total PEE, RCB do PEE e total com FRC à taxa do edital.
- Limites por rubrica e faixa de valor por tipologia.
- Conflitos: mesma UC em duas propostas do mesmo edital; dois projetos de
  iluminação pública no mesmo município.

## 6. Fases de entrega
**Fase 1, fundação (uso interno)**
- Projeto Next.js + TypeScript, banco Postgres (Supabase, região São Paulo),
  autenticação por e-mail, organizações e papéis.
- Todas as telas do protótipo funcionando com o banco.
- Script de importação de `prototype/seed/` (editais reais; exemplos opcionais).
- Testes da lógica de negócio. Deploy em ambiente de teste.

**Fase 2, produção interna**
- Domínio próprio, ambiente de produção, backups diários, exportação em planilha.
- Alertas por e-mail: certidão vencendo, próxima ação atrasada, prazo de edital.
- Anexar arquivos diretamente (armazenamento no Brasil) além do link do OneDrive.

**Fase 3, diferenciais**
- Integração Microsoft Graph: ler a pasta do projeto no OneDrive/SharePoint e
  sugerir o status de cada documento do checklist.
- Importar edital em PDF: extrair regras e checklist com IA para revisão humana
  antes de salvar.
- Exportar dados para a planilha RCB oficial da distribuidora.

**Fase 4, produto comercial**
- Cadastro de novas ESCOs, planos e cobrança recorrente, termos de uso, política de
  privacidade e contrato de tratamento de dados (LGPD), página pública.

## 7. Fora do escopo da v1
Aplicativo móvel nativo (a versão web deve funcionar bem no celular), integração com
ERP/financeiro, assinatura eletrônica.

## 8. Critérios de pronto da Fase 1
- Dois usuários de organizações diferentes não enxergam dados um do outro (teste).
- Com os dados de exemplo importados, os valores de PEE e RCB batem com os do
  protótipo (ver CLAUDE.md) e os alertas aparecem iguais.
- Funciona em tela de celular de 400 px sem rolagem horizontal.
