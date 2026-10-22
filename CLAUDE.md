# Painel PEE: CRM para ESCOs

## O que é
CRM web para ESCOs (empresas de serviços de energia) que desenvolvem projetos do
Programa de Eficiência Energética (PEE) da ANEEL. As distribuidoras (Cemig, Light,
Enel, Energisa...) abrem Chamadas Públicas de Projetos (CPP) com regras próprias.
A ESCO prospecta clientes (hospitais, prefeituras, escolas, indústrias), monta a
proposta com dezenas de documentos e um cálculo de RCB, submete e depois executa.

O produto será usado primeiro pela nossa ESCO e depois vendido a outras ESCOs (SaaS).

## Ponto de partida
- `prototype/crm-prototipo.html`: protótipo funcional validado pela equipe. É a
  referência de telas, fluxos, textos e lógica. Toda a lógica de negócio está no
  `<script>` dele (funções `docRows`, `docStatus`, `calc`, `projIssues`).
- `prototype/seed/`: dados no formato do protótipo. `editais/cemig-cpp-001-2026.json`
  contém as regras REAIS da CPP Cemig 001/2026 (checklist, limites, CEE/CED,
  pontuação). Clientes, projetos e interações são FICTÍCIOS (campo `exemplo: true`).
- `docs/editais/`: PDFs originais do Regulamento e da Especificação Técnica da
  Cemig, fonte das regras acima.
- `docs/SPEC.md`: especificação da versão 1. Leia antes de qualquer tarefa.

## Decisões já tomadas
- Interface em português do Brasil; código, nomes de tabelas e commits em inglês.
- Layout branco, limpo, "essencial primeiro, detalhes em seções que abrem".
  Cada projeto mostra um "Próximo passo" claro. Não aumentar a densidade de informação.
- Multiempresa (multi-tenant) desde o início: cada ESCO só vê os próprios dados.
- Dados pessoais (nomes, CPF, e-mail, telefone) sujeitos à LGPD; hospedagem no Brasil.
- Arquivos dos clientes continuam no OneDrive/SharePoint de cada ESCO (integração
  via Microsoft Graph na fase 3). O CRM guarda metadados, não cópias, salvo quando
  o usuário anexar diretamente.
- Regras de edital são DADOS (JSON validado), nunca código fixo: cada distribuidora e
  cada ano muda limites, documentos e prazos. A ANEEL está revisando o PEE
  (Consulta Pública 18/2026), então tudo deve ser configurável.
- A RCB calculada é uma estimativa (PROPEE módulo 7). A planilha oficial da
  distribuidora prevalece; deixar isso explícito na interface.

## Como trabalhar neste repositório
- Antes de codar uma fase, proponha o plano e espere aprovação.
- Escreva testes para a lógica de negócio (validade de documentos, cálculo de RCB,
  limites por rubrica). A referência é a planilha oficial de RCB da Cemig
  (`docs/editais/Planilha-RCB-CPP-2026-rev01.xlsx`), que inclui a auditoria contábil
  e financeira de R$ 1.500 exigida pela ET 5.16.1 (o protótipo não a incluía).
  Com os dados de exemplo: Hospital São Lucas (p1) dá PEE ≈ R$ 731.607 e
  RCB ≈ 0,535; Vale do Sereno (p2) PEE ≈ R$ 2.706.218 e RCB ≈ 0,433; Escolas (p3)
  PEE ≈ R$ 637.833 e RCB ≈ 0,665. Sem a auditoria, os valores são idênticos aos do
  protótipo (p1 R$ 730.107 e 0,534). `scripts/check-official-rcb.py` repete a
  conferência na planilha quando a distribuidora publicar uma revisão.
- A planilha oficial também calcula a RCB por uso final: acima do limite é alerta,
  não desclassifica (Regulamento 11.1.2), mas deve aparecer na interface.
- Nunca colocar segredos no código; usar variáveis de ambiente e `.env.example`.
- Explique em linguagem simples o que foi feito ao fim de cada tarefa: o dono do
  projeto não é desenvolvedor.
