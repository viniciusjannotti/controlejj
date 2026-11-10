// ============================================================
// Converte planilhas (xlsx/csv) em texto que o conselheiro entende.
// Cada linha vira "Coluna: valor; Coluna: valor", com o nome das
// colunas repetido, para que um trecho solto continue legível. No
// topo de cada aba vai um resumo numérico calculado aqui (soma,
// média, mínimo, máximo): a IA erra conta, o código não.
// ============================================================

export type Celula = string | number | boolean | Date | null | undefined;

export interface Aba {
  nome: string;
  linhas: Celula[][];
}

const vazio = (c: Celula) => c === null || c === undefined || (typeof c === 'string' && c.trim() === '');

function numero(n: number): string {
  return n.toLocaleString('pt-BR', { useGrouping: false, maximumFractionDigits: 4 });
}

function formatar(c: Celula): string {
  if (c instanceof Date) {
    if (Number.isNaN(c.getTime())) return '';
    const iso = c.toISOString();
    const hora = iso.slice(11, 16);
    return `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}${hora !== '00:00' ? ` ${hora}` : ''}`;
  }
  if (typeof c === 'number') return numero(c);
  if (typeof c === 'boolean') return c ? 'sim' : 'não';
  return String(c ?? '').replace(/\s+/g, ' ').trim();
}

const letraColuna = (i: number): string => (i < 26 ? String.fromCharCode(65 + i) : letraColuna(Math.floor(i / 26) - 1) + String.fromCharCode(65 + (i % 26)));

/** Primeira linha preenchida vira cabeçalho se for quase toda texto; senão, as colunas viram A, B, C... */
function separarCabecalho(linhas: Celula[][]): { cabecalho: string[]; corpo: Celula[][]; inicio: number } {
  const largura = Math.max(0, ...linhas.map((l) => l.length));
  const primeira = linhas.findIndex((l) => l.some((c) => !vazio(c)));
  if (primeira < 0) return { cabecalho: [], corpo: [], inicio: 0 };
  const candidata = linhas[primeira];
  const preenchidas = candidata.filter((c) => !vazio(c));
  const ehCabecalho = preenchidas.length > 0 && preenchidas.filter((c) => typeof c === 'string').length / preenchidas.length >= 0.8;
  if (!ehCabecalho) {
    return { cabecalho: Array.from({ length: largura }, (_, i) => `Coluna ${letraColuna(i)}`), corpo: linhas.slice(primeira), inicio: primeira };
  }
  const usados = new Map<string, number>();
  const cabecalho = Array.from({ length: largura }, (_, i) => {
    const base = formatar(candidata[i]) || `Coluna ${letraColuna(i)}`;
    const n = (usados.get(base) ?? 0) + 1;
    usados.set(base, n);
    return n > 1 ? `${base} (${n})` : base;
  });
  return { cabecalho, corpo: linhas.slice(primeira + 1), inicio: primeira + 1 };
}

function resumoNumerico(cabecalho: string[], corpo: Celula[][]): string[] {
  const linhas: string[] = [];
  cabecalho.forEach((nome, i) => {
    const preenchidas = corpo.map((l) => l[i]).filter((c) => !vazio(c));
    const nums = preenchidas.filter((c): c is number => typeof c === 'number' && Number.isFinite(c));
    // Só colunas realmente numéricas (a maioria das células preenchidas é número).
    if (nums.length < 2 || nums.length < preenchidas.length * 0.8) return;
    const soma = nums.reduce((s, n) => s + n, 0);
    linhas.push(`- ${nome}: soma ${numero(soma)}, média ${numero(soma / nums.length)}, mínimo ${numero(Math.min(...nums))}, máximo ${numero(Math.max(...nums))} (${nums.length} valores)`);
  });
  return linhas;
}

export function planilhaParaTexto(abas: Aba[], nomeArquivo: string): string {
  const partes: string[] = [];
  for (const aba of abas) {
    const { cabecalho, corpo, inicio } = separarCabecalho(aba.linhas);
    const comDados = corpo.map((l, i) => ({ l, numero: inicio + i + 1 })).filter(({ l }) => l.some((c) => !vazio(c)));
    if (comDados.length === 0) continue;

    partes.push(`Planilha "${nomeArquivo}", aba "${aba.nome}": ${comDados.length} linhas de dados. Colunas: ${cabecalho.join(', ')}.`);
    const resumo = resumoNumerico(cabecalho, comDados.map((x) => x.l));
    if (resumo.length) partes.push(`Resumo numérico da aba "${aba.nome}" (calculado pelo QG):\n${resumo.join('\n')}`);
    for (const { l, numero: n } of comDados) {
      const campos = cabecalho
        .map((nome, i) => ({ nome, valor: formatar(l[i]) }))
        .filter((x) => x.valor !== '')
        .map((x) => `${x.nome}: ${x.valor}`);
      partes.push(`Aba "${aba.nome}", linha ${n}: ${campos.join('; ')}`);
    }
  }
  // Linha em branco entre registros: a busca trata cada linha como um parágrafo.
  return partes.join('\n\n');
}
