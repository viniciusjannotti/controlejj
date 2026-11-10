import { describe, expect, it } from 'vitest';
import { buscarTrechos } from './busca';
import { planilhaParaTexto } from './planilha';

const abas = [
  {
    nome: 'Projetos',
    linhas: [
      ['Projeto', 'Modalidade', 'Alunos', 'Início'],
      ['Vôlei no Bairro', 'Vôlei', 45, new Date(Date.UTC(2025, 2, 10))],
      [null, null, null, null],
      ['Tatame Aberto', 'Lutas', 30, new Date(Date.UTC(2024, 7, 1))],
      ['Bola na Rede', 'Futebol', 80, null],
    ],
  },
  { nome: 'Vazia', linhas: [[null], []] },
];

describe('planilhaParaTexto', () => {
  const texto = planilhaParaTexto(abas, 'projetos.xlsx');

  it('descreve a aba e cada linha com o nome das colunas', () => {
    expect(texto).toContain('Planilha "projetos.xlsx", aba "Projetos": 3 linhas de dados. Colunas: Projeto, Modalidade, Alunos, Início.');
    expect(texto).toContain('Aba "Projetos", linha 2: Projeto: Vôlei no Bairro; Modalidade: Vôlei; Alunos: 45; Início: 10/03/2025');
    // Célula vazia é omitida, e a numeração respeita a linha original do Excel.
    expect(texto).toContain('Aba "Projetos", linha 5: Projeto: Bola na Rede; Modalidade: Futebol; Alunos: 80');
  });

  it('calcula o resumo numérico exato', () => {
    expect(texto).toContain('- Alunos: soma 155, média 51,6667, mínimo 30, máximo 80 (3 valores)');
    expect(texto).not.toMatch(/- Projeto:/);
  });

  it('ignora abas e linhas vazias', () => {
    expect(texto).not.toContain('Vazia');
    expect(texto).not.toContain('linha 3:');
  });

  it('sem cabeçalho, nomeia as colunas pela letra', () => {
    const t = planilhaParaTexto([{ nome: 'Dados', linhas: [[1, 2], [3, 4]] }], 'x.xlsx');
    expect(t).toContain('linha 1: Coluna A: 1; Coluna B: 2');
    expect(t).toContain('- Coluna B: soma 6');
  });

  it('cabeçalhos repetidos ganham número', () => {
    const t = planilhaParaTexto([{ nome: 'A', linhas: [['Nome', 'Nome'], ['x', 'y']] }], 'x.xlsx');
    expect(t).toContain('Nome: x; Nome (2): y');
  });

  it('planilha pequena e relevante vai inteira; sem relação, não vai', () => {
    const docs = [{ id: 'p', titulo: 'Planilha de projetos', texto, inteiro: true }];
    const r = buscarTrechos('qual projeto tem mais alunos?', docs);
    expect(r).toHaveLength(1);
    expect(r[0].texto).toBe(texto);
    expect(buscarTrechos('previsão do tempo sábado', docs)).toEqual([]);
    // Grande demais: volta a mandar só os trechos.
    expect(buscarTrechos('qual projeto tem mais alunos?', docs, { limiteInteiro: 100 })[0].texto).not.toBe(texto);
  });

  it('a busca acha a linha certa pela pergunta', () => {
    const r = buscarTrechos('quantos alunos tem o projeto de lutas?', [{ id: 'p', titulo: 'Planilha de projetos', texto }]);
    expect(r.map((x) => x.texto).join(' ')).toContain('Tatame Aberto');
  });
});
