# Fase 2: produção interna (plano)

Objetivo: tirar o Painel PEE do ambiente de testes e deixá-lo pronto para o uso
diário da equipe, com domínio próprio, backups, e-mail, alertas, anexos e exportação.

Cada etapa termina com algo que o dono do projeto confere no navegador ou no e-mail.

## Etapas

| # | Etapa | O que o dono do projeto faz | Como conferir |
|---|---|---|---|
| 1 | Domínio e e-mail próprio | Indicar o domínio e dar acesso ao painel de DNS; criar conta no Resend | E-mail de login chega de `avisos@...` e o link funciona no celular, em qualquer navegador |
| 2 | Ambiente de produção | Assinar Supabase Pro e Vercel Pro; criar o projeto de produção em São Paulo | Entrar em `painel.<domínio>`; backups diários ativos no painel do Supabase |
| 3 | Exportação em planilha | Nada | Baixar projetos, documentos e cálculo de RCB em Excel |
| 4 | Anexos | Nada | Anexar uma certidão em PDF a um documento e abrir pelo celular |
| 5 | Alertas por e-mail | Escolher o horário do resumo diário | Receber o resumo com tarefas, certidões vencendo e prazos; botão "enviar teste agora" |
| 6 | Calendário por assinatura | Nada | Assinar no Outlook ou Google; mudar uma data no sistema e ver a agenda atualizar |
| 7 | Entrada em produção | Convidar a equipe no ambiente novo | Restauração de backup ensaiada; lista de conferência de entrada concluída |

## Detalhes por etapa

1. **Domínio e e-mail próprio.** O site passa a responder em `painel.<domínio>`. Os
   e-mails saem por um serviço próprio (Resend) num subdomínio, por exemplo
   `avisos.<domínio>`, sem interferir no e-mail corporativo. Com isso: modelo de
   e-mail de login em português, link que funciona em qualquer navegador e fim do
   limite de cerca de 2 e-mails por hora.
2. **Ambiente de produção.** Projeto Supabase novo (São Paulo, plano Pro, backups
   diários) e Vercel em produção ligada ao domínio. O ambiente atual vira o de
   testes, para experimentar mudanças antes de publicá-las.
3. **Exportação em planilha.** Botões "Exportar" na lista de projetos, na aba
   Documentos e na aba Viabilidade, gerando arquivos Excel.
4. **Anexos.** Arquivos guardados no Brasil (Supabase Storage, São Paulo), separados
   por ESCO pelas mesmas regras de segurança do banco. Continua possível usar só o
   link do OneDrive.
5. **Alertas por e-mail.** Resumo diário por pessoa: o que fazer hoje, próximas
   ações atrasadas, certidões que vencem nos próximos 15 dias e prazos de edital
   nos próximos 7 dias. Cada pessoa pode desligar.
6. **Calendário por assinatura.** Um link secreto por pessoa, que o Outlook e o
   Google consultam sozinhos. O link pode ser trocado a qualquer momento.
7. **Entrada em produção.** Ensaio de restauração de backup, revisão de segurança
   do ambiente novo, convite da equipe e orientação de uso.

## Custos mensais estimados

| Serviço | Plano | Custo aproximado |
|---|---|---|
| Supabase | Pro | US$ 25 por mês |
| Vercel | Pro | US$ 20 por mês por pessoa que publica |
| Resend | Gratuito (3.000 e-mails por mês) | R$ 0 |
| Domínio | registro.br | cerca de R$ 40 por ano, se ainda não houver |

Preços a confirmar na contratação. O plano gratuito da Vercel não permite uso
comercial, e o uso interno de uma empresa conta como comercial; por isso o Pro
entra na etapa 2.
