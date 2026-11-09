import { describe, expect, it } from 'vitest';
import { buscarTrechos, dividirEmTrechos, termos } from './busca';

const EDITAL = `Edital Municipal de Apoio ao Esporte (exemplo)

1. Quem pode participar: projetos sociais esportivos com pelo menos um ano de atividade.

2. Documentos exigidos: estatuto da associação, CNPJ, lista de alunos atendidos e plano de trabalho.

3. Orçamento: cada projeto pode pedir até R$ 20 mil para materiais, uniformes e transporte.

4. Prazo de inscrição: as propostas devem ser enviadas pelo protocolo da prefeitura até 30 de março.`;

const UNIFORME = `Guia de compra de uniformes (exemplo)

Pedir três orçamentos de fornecedores locais antes de comprar. Guardar as notas fiscais para a prestação de contas.`;

const CARDAPIO = `Cardápio do lanche (exemplo)

Frutas, pão e suco depois do treino. Evitar refrigerante.`;

const docs = [
  { id: 'edital', titulo: 'Edital de apoio ao esporte', texto: EDITAL },
  { id: 'uniforme', titulo: 'Guia de uniformes', texto: UNIFORME },
  { id: 'lanche', titulo: 'Cardápio do lanche', texto: CARDAPIO },
];

describe('termos', () => {
  it('ignora acentos, maiúsculas, palavras vazias e aproxima plurais', () => {
    expect(termos('Os EDITAIS de Orçamento')).toEqual(termos('edital orçamentos'));
    expect(termos('inscrições')).toEqual(termos('inscrição'));
    expect(termos('de para com')).toEqual([]);
  });
});

describe('dividirEmTrechos', () => {
  it('respeita parágrafos e o tamanho máximo', () => {
    const t = dividirEmTrechos(EDITAL, 200);
    expect(t.length).toBeGreaterThan(2);
    for (const x of t) expect(x.length).toBeLessThanOrEqual(200);
    expect(t.join(' ')).toContain('Orçamento: cada projeto pode pedir');
  });

  it('corta parágrafo gigante por frases', () => {
    const longo = Array.from({ length: 80 }, (_, i) => `Frase número ${i} do texto.`).join(' ');
    const t = dividirEmTrechos(longo, 300);
    expect(t.length).toBeGreaterThan(5);
    for (const x of t) expect(x.length).toBeLessThanOrEqual(300);
  });
});

describe('buscarTrechos', () => {
  it('acha o passo a passo do edital com outras palavras', () => {
    const r = buscarTrechos('Como um projeto consegue verba pelos editais? Quais documentos precisa?', docs);
    expect(r.length).toBeGreaterThan(0);
    expect(r[0].documento_id).toBe('edital');
    expect(r.map((x) => x.texto).join(' ')).toContain('Documentos exigidos');
  });

  it('acha o trecho de orçamento mesmo no plural e sem acento', () => {
    const r = buscarTrechos('quanto de orcamentos cada projeto pode pedir', docs);
    expect(r.map((x) => x.texto).join(' ')).toContain('R$ 20 mil');
    expect(r.some((x) => x.documento_id === 'lanche')).toBe(false);
  });

  it('não devolve nada quando a pergunta não tem relação', () => {
    expect(buscarTrechos('qual a previsão do tempo para sábado', docs)).toEqual([]);
    expect(buscarTrechos('', docs)).toEqual([]);
  });

  it('respeita o limite de caracteres e de trechos', () => {
    const muitos = Array.from({ length: 20 }, (_, i) => ({ id: `d${i}`, titulo: `Edital ${i}`, texto: EDITAL }));
    const r = buscarTrechos('edital orçamento documentos inscrição', muitos, { limiteCaracteres: 1000, maxTrechos: 5 });
    expect(r.length).toBeLessThanOrEqual(5);
    expect(r.reduce((s, x) => s + x.texto.length, 0)).toBeLessThanOrEqual(1000);
  });
});
