# Fase 1: resumo e próximos passos

## O que foi entregue

Todas as telas do protótipo funcionando com banco de dados, login e várias empresas
isoladas entre si:

- **Início**: tarefas do dia, contagem regressiva do edital aberto, lembretes dos
  próximos 30 dias, notícias de chamadas públicas e projetos em andamento.
- **Projetos**: fases e 11 etapas, próximo passo, abas Visão geral, Documentos,
  Viabilidade e Execução.
- **Clientes**: dados, contatos, próxima ação, histórico e mensagens prontas.
- **Editais**: essencial no topo, regras em seções que abrem, cópia para a ESCO.
- **Pipeline**, **Calendário** (com arquivo para Outlook e Google) e **Distribuidoras**.
- **Equipe**: convites por e-mail, papéis, histórico de alterações.

## Critérios de pronto (SPEC.md, seção 8)

| Critério | Situação | Como foi verificado |
|---|---|---|
| Duas ESCOs não enxergam dados uma da outra | Atendido | Teste que varre todas as tabelas do banco, mais testes por papel |
| PEE, RCB e alertas iguais à referência | Atendido | Comparação com o código do protótipo e com a planilha oficial da Cemig |
| Celular de 400 px sem rolagem lateral | Atendido | 18 telas e 100 janelas de formulário conferidas automaticamente |

São 117 testes automáticos.

## Decisões tomadas durante a fase

- **Auditoria de R$ 1.500** incluída no custo do PEE (ET 5.16.1), seguindo a planilha
  oficial da Cemig. O protótipo não a incluía.
- **RCB por uso final** mostrada com alerta, como na planilha oficial; não desclassifica.
- **Limite de 0,90** vale para projetos só com fontes incentivadas ou armazenamento.
- **Prazo de obra e fotos mínimas** vêm do edital, não do código.
- **Entrada por convite**: novas ESCOs ficam bloqueadas no banco até a fase comercial.
- **Sem seletor de ESCO**: a empresa usa uma só.

## Pendências conhecidas

- **E-mail de login**: o plano grátis do Supabase envia poucos e-mails por hora, e o
  link precisa ser aberto no mesmo navegador. Resolve com e-mail próprio (Fase 2).
- **Notícias**: vêm do Google Notícias, adequado para uso interno. Para vender o
  produto, trocar por um serviço de notícias com licença.
- **Calendário**: o arquivo baixado é uma cópia; a assinatura que se atualiza sozinha
  depende da Fase 2.
- **Ferramenta de padronização de código (ESLint)**: tem um aviso de segurança sem
  correção publicada; afeta só o computador de desenvolvimento, não o site.

## Proposta da Fase 2: produção interna

| Item | O que muda para a equipe |
|---|---|
| Ambiente de produção | Separado do de testes, com backups diários (Supabase Pro) |
| Domínio próprio | Ex.: painel.suaesco.com.br |
| E-mail próprio | Login sem limite por hora e link que funciona em qualquer navegador |
| Alertas por e-mail | Certidão vencendo, próxima ação atrasada, prazo de edital |
| Calendário por assinatura | Outlook e Google atualizados sozinhos |
| Anexos | Arquivos guardados no Brasil, além do link do OneDrive |
| Exportação em planilha | Projetos, documentos e cálculos em Excel |

Custo estimado em produção: cerca de R$ 250 por mês (Supabase Pro, Vercel Pro para
quem publica e domínio), conforme os preços vigentes na contratação.

Depois da Fase 2, os pedidos já anotados para a Fase 3: leitura automática da pasta
do OneDrive para conferir documentos, importação de editais em PDF com IA,
exportação para a planilha RCB oficial e, se desejado, integração completa com o
WhatsApp.
