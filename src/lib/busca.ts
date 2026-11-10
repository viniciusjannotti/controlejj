// ============================================================
// Busca nos documentos para o conselheiro de IA. Em vez de mandar
// todos os editais e guias a cada pergunta (lento e caro na cota),
// o texto é dividido em trechos e só os mais parecidos com a pergunta
// seguem para a IA. É uma busca por palavras (BM25), sem serviço
// externo: funciona de graça e nada sai do servidor para encontrar
// os trechos.
// ============================================================

const PARADAS = new Set(
  'a o as os um uma uns umas de do da dos das no na nos nas em por para pra com sem sobre entre ate apos e ou mas que se ao aos pela pelo pelas pelos como quando onde qual quais quem cujo cuja isso isto esse essa este esta aquele aquela ele ela eles elas eu voce voces nos me te lhe seu sua seus suas meu minha nosso nossa ja nao sim mais menos muito muita bem tambem so ser sao foi era sera estar esta estao ter tem tinha ha haver pode podem deve devem fazer feito the and'.split(' '),
);

function normalizar(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

/** Radical simples para português: aproxima plurais e flexões ("editais" ~ "edital"). */
function radical(p: string): string {
  let r = p
    .replace(/oes$|aes$/, 'ao')
    .replace(/ais$/, 'al')
    .replace(/eis$/, 'el')
    .replace(/ns$/, 'm');
  if (r.length > 4) r = r.replace(/s$/, '');
  return r.slice(0, 7);
}

export function termos(texto: string): string[] {
  return (normalizar(texto).match(/[a-z0-9]+/g) ?? []).filter((p) => p.length >= 3 && !PARADAS.has(p)).map(radical);
}

/** Divide em trechos de ~tamanho caracteres, respeitando parágrafos quando possível. */
export function dividirEmTrechos(texto: string, tamanho = 1200): string[] {
  const paragrafos = texto
    .replace(/\r/g, '')
    .split(/\n\s*\n|\n(?=\s*(?:\d+[.)]|[-•*])\s)/)
    .map((p) => p.replace(/\s+/g, ' ').trim())
    .filter(Boolean);
  const trechos: string[] = [];
  let atual = '';
  const fechar = () => {
    if (atual.trim()) trechos.push(atual.trim());
    atual = '';
  };
  for (const p of paragrafos) {
    if (p.length > tamanho) {
      fechar();
      // Parágrafo enorme: corta por frases.
      for (const frase of p.match(/[^.!?;]+[.!?;]*\s*/g) ?? [p]) {
        if ((atual + frase).length > tamanho) fechar();
        atual += frase.length > tamanho ? frase.slice(0, tamanho) : frase;
      }
      fechar();
    } else {
      if ((atual + '\n' + p).length > tamanho) fechar();
      atual = atual ? `${atual}\n${p}` : p;
    }
  }
  fechar();
  return trechos;
}

export interface DocumentoBusca {
  id: string;
  titulo: string;
  texto: string;
  /** Planilhas: se forem relevantes e pequenas, vão inteiras, para a IA poder comparar todas as linhas. */
  inteiro?: boolean;
}

export interface Trecho {
  documento_id: string;
  titulo: string;
  posicao: number;
  texto: string;
  pontuacao: number;
}

export interface OpcoesBusca {
  limiteCaracteres?: number;
  maxTrechos?: number;
  maxPorDocumento?: number;
  /** Tamanho máximo de um documento `inteiro` para ir completo. */
  limiteInteiro?: number;
  /** Espaço total para documentos inteiros, além do limite dos trechos. */
  limiteTotalInteiros?: number;
}

/** Devolve os trechos mais relevantes para a pergunta, na ordem em que aparecem em cada documento. */
export function buscarTrechos(pergunta: string, docs: DocumentoBusca[], opcoes: OpcoesBusca = {}): Trecho[] {
  const { limiteCaracteres = 12000, maxTrechos = 8, maxPorDocumento = 4, limiteInteiro = 20000, limiteTotalInteiros = 30000 } = opcoes;
  const consulta = [...new Set(termos(pergunta))];
  if (consulta.length === 0) return [];

  const unidades = docs.flatMap((d) => {
    const titulo = new Set(termos(d.titulo));
    const bonusTitulo = consulta.filter((t) => titulo.has(t)).length;
    return dividirEmTrechos(d.texto).map((texto, posicao) => ({ d, posicao, texto, termos: termos(texto), bonusTitulo }));
  });
  if (unidades.length === 0) return [];

  const mediaTamanho = unidades.reduce((s, u) => s + u.termos.length, 0) / unidades.length || 1;
  const df = new Map<string, number>();
  for (const t of consulta) df.set(t, unidades.filter((u) => u.termos.includes(t)).length);

  const k1 = 1.2;
  const b = 0.75;
  const pontuadas = unidades
    .map((u) => {
      let bm25 = 0;
      for (const t of consulta) {
        const tf = u.termos.filter((x) => x === t).length;
        if (!tf) continue;
        const n = df.get(t) ?? 0;
        const idf = Math.log(1 + (unidades.length - n + 0.5) / (n + 0.5));
        bm25 += idf * ((tf * (k1 + 1)) / (tf + k1 * (1 - b + (b * u.termos.length) / mediaTamanho)));
      }
      // O título conta, mas só reforça trechos que já têm algo a ver com a pergunta.
      return { ...u, pontuacao: bm25 > 0 ? bm25 + 0.5 * u.bonusTitulo : 0 };
    })
    .filter((u) => u.pontuacao > 0)
    .sort((a, b2) => b2.pontuacao - a.pontuacao);

  const escolhidos: typeof pontuadas = [];
  const porDoc = new Map<string, number>();
  let usados = 0;
  for (const u of pontuadas) {
    if (escolhidos.length >= maxTrechos) break;
    if ((porDoc.get(u.d.id) ?? 0) >= maxPorDocumento) continue;
    if (usados + u.texto.length > limiteCaracteres) continue;
    escolhidos.push(u);
    porDoc.set(u.d.id, (porDoc.get(u.d.id) ?? 0) + 1);
    usados += u.texto.length;
  }

  const trechos = escolhidos
    .sort((a, b2) => a.d.titulo.localeCompare(b2.d.titulo, 'pt-BR') || a.posicao - b2.posicao)
    .map((u) => ({ documento_id: u.d.id, titulo: u.d.titulo, posicao: u.posicao, texto: u.texto, pontuacao: Math.round(u.pontuacao * 100) / 100 }));

  // Planilha relevante e pequena: troca os trechos dela pelo texto completo (até o espaço reservado).
  let reservado = 0;
  const inteiros = new Map<string, Trecho>();
  for (const d of docs) {
    if (!d.inteiro || d.texto.length > limiteInteiro || reservado + d.texto.length > limiteTotalInteiros) continue;
    const dele = trechos.filter((t) => t.documento_id === d.id);
    if (dele.length === 0) continue;
    inteiros.set(d.id, { documento_id: d.id, titulo: d.titulo, posicao: 0, texto: d.texto, pontuacao: Math.max(...dele.map((t) => t.pontuacao)) });
    reservado += d.texto.length;
  }
  if (inteiros.size === 0) return trechos;
  return [...trechos.filter((t) => !inteiros.has(t.documento_id)), ...inteiros.values()];
}
