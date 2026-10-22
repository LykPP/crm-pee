/** Suggested folder structure for a project, as in the prototype. */
export function folderTree(projectName: string, unitNumbers: string[]) {
  const units = unitNumbers.length ? unitNumbers : ["xxxxxxxxxx"];
  return `${projectName}/
├── 01_Habilitacao/        formulário, contrato social, poderes, CNPJ, anuência
├── 02_Certidoes/          municipal, estadual, federal, FGTS, trabalhista
├── 03_UCs/
${units.map((u, i) => `│   ${i === units.length - 1 ? "└" : "├"}── UC_${u}/   fatura, fotos do levantamento`).join("\n")}
├── 04_Diagnostico/        relatório Word, planilha RCB, tabelas, ARTs
├── 05_Orcamentos_Catalogos/
├── 06_Execucao/           fotos antes e depois, descarte (MTR e CDF)
└── 07_MV_Relatorio_Final/`;
}
