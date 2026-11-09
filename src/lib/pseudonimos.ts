// ============================================================
// Pseudônimos para a IA. O plano gratuito do Gemini pode usar o que
// recebe para treinar modelos e passar por revisão humana, e os termos
// pedem para não enviar dados pessoais. Antes do envio, cada pessoa
// vira um código ([E1] equipe, [C1] contato, [R1] responsável de projeto),
// e telefones e e-mails soltos no texto são removidos. Na volta, os
// códigos são trocados de novo pelos nomes, só dentro do QG.
//
// Limite: um nome que não está cadastrado em lugar nenhum e foi digitado
// num texto livre não tem como ser reconhecido e segue como está.
// ============================================================

export interface Pessoa {
  /** Chave interna: e-mail do membro, id do contato ou nome do responsável. */
  chave: string;
  nome: string;
  tipo: 'E' | 'C' | 'R';
}

export interface Pseudonimos {
  /** chave interna -> código */
  codigoDe: Map<string, string>;
  /** código -> chave interna */
  chaveDe: Map<string, string>;
  /** código -> nome, para mostrar na tela */
  nomes: Record<string, string>;
  regras: { re: RegExp; codigo: string }[];
}

// Palavras capitalizadas comuns que não devem ser tratadas como primeiro nome.
const NAO_NOMES = new Set(['você', 'voce', 'equipe', 'projeto', 'prefeitura', 'secretaria', 'secretário', 'secretária', 'dona', 'seu', 'treinador', 'professor', 'professora', 'responsável']);

const escapar = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const fronteira = (s: string) => `(?<![\\p{L}\\p{N}])${s}(?![\\p{L}\\p{N}])`;

/** Partes de um nome que dão para reconhecer no texto, sem o que vem entre parênteses. */
function partesDoNome(nome: string): string[] {
  return nome.replace(/\(.*?\)/g, ' ').trim().split(/\s+/).filter(Boolean);
}

export function criarPseudonimos(pessoas: Pessoa[]): Pseudonimos {
  const codigoDe = new Map<string, string>();
  const chaveDe = new Map<string, string>();
  const nomes: Record<string, string> = {};
  const contagem = { E: 0, C: 0, R: 0 };

  for (const p of pessoas) {
    if (codigoDe.has(p.chave)) continue;
    const codigo = `${p.tipo}${++contagem[p.tipo]}`;
    codigoDe.set(p.chave, codigo);
    chaveDe.set(codigo, p.chave);
    nomes[codigo] = p.nome;
  }

  // Nome completo primeiro (mais longo vence); depois o primeiro nome, se só uma pessoa o tiver.
  const completos: { texto: string; codigo: string }[] = [];
  const primeiros = new Map<string, string[]>();
  for (const [codigo, nome] of Object.entries(nomes)) {
    const partes = partesDoNome(nome);
    if (partes.length >= 2) completos.push({ texto: partes.join(' '), codigo });
    const primeiro = partes[0];
    if (primeiro && primeiro.length >= 3 && !NAO_NOMES.has(primeiro.toLowerCase())) {
      primeiros.set(primeiro.toLowerCase(), [...(primeiros.get(primeiro.toLowerCase()) ?? []), codigo]);
    }
  }
  completos.sort((a, b) => b.texto.length - a.texto.length);

  const regras = [
    ...completos.map((c) => ({ re: new RegExp(fronteira(c.texto.split(' ').map(escapar).join('\\s+')), 'giu'), codigo: c.codigo })),
    ...[...primeiros.entries()]
      .filter(([, codigos]) => new Set(codigos).size === 1)
      .map(([primeiro, [codigo]]) => ({ re: new RegExp(fronteira(escapar(primeiro)), 'giu'), codigo })),
  ];

  return { codigoDe, chaveDe, nomes, regras };
}

const EMAIL = /[\p{L}\p{N}._%+-]+@[\p{L}\p{N}.-]+\.[\p{L}]{2,}/gu;
// Telefones brasileiros com ou sem DDD/+55, com separadores variados.
const TELEFONE = /(?<!\d)(?:\+?55[\s.-]?)?(?:\(?\d{2}\)?[\s.-]?)?9?\d{4}[\s.-]?\d{4}(?!\d)/g;

/** Troca nomes conhecidos por códigos e remove e-mails e telefones. */
export function anonimizarTexto(texto: string, p: Pseudonimos): string {
  let saida = texto.replace(EMAIL, '[e-mail removido]').replace(TELEFONE, '[telefone removido]');
  for (const { re, codigo } of p.regras) saida = saida.replace(re, `[${codigo}]`);
  return saida;
}

/** Troca os códigos de volta pelos nomes. Código desconhecido fica como está. */
export function desanonimizar(texto: string, nomes: Record<string, string>): string {
  return texto.replace(/\[([ECR]\d+)\]/g, (original, codigo: string) => nomes[codigo] ?? original);
}
