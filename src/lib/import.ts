// ============================================================
// Importação dos arquivos exportados pelo Mapa Joga Junto.
// Roda no navegador: o CSV de inscrições é reduzido a totais por
// projeto ANTES de qualquer envio, então nomes, telefones e dados
// de menores nunca saem da máquina de quem está importando.
// ============================================================

import { z } from 'zod';

export type TipoImportacao = 'projetos' | 'contatos' | 'inscricoes';
export type Linha = Record<string, string>;

const MAX_LINHAS = 5000;

export function normalizar(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

export function slug(s: string): string {
  return normalizar(s).replace(/ /g, '-').slice(0, 120);
}

/** Interpreta CSV com BOM, separador ; ou , aspas e quebras de linha dentro de campos. */
export function parseCsv(texto: string): Linha[] {
  const fonte = texto.replace(/^﻿/, '');
  const primeira = fonte.split(/\r?\n/, 1)[0] ?? '';
  const sep = (primeira.match(/;/g)?.length ?? 0) >= (primeira.match(/,/g)?.length ?? 0) ? ';' : ',';

  const linhas: string[][] = [];
  let campo = '';
  let linha: string[] = [];
  let aspas = false;

  for (let i = 0; i < fonte.length; i++) {
    const c = fonte[i];
    if (aspas) {
      if (c === '"' && fonte[i + 1] === '"') {
        campo += '"';
        i++;
      } else if (c === '"') {
        aspas = false;
      } else {
        campo += c;
      }
    } else if (c === '"') {
      aspas = true;
    } else if (c === sep) {
      linha.push(campo);
      campo = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && fonte[i + 1] === '\n') i++;
      linha.push(campo);
      campo = '';
      linhas.push(linha);
      linha = [];
    } else {
      campo += c;
    }
  }
  if (campo !== '' || linha.length > 0) {
    linha.push(campo);
    linhas.push(linha);
  }

  const [cabecalho, ...corpo] = linhas.filter((l) => l.some((v) => v.trim() !== ''));
  if (!cabecalho) return [];
  return corpo.map((valores) => Object.fromEntries(cabecalho.map((nome, i) => [nome.trim(), (valores[i] ?? '').trim()])));
}

/** Lê .csv ou .json (lista de objetos) e devolve linhas de texto. */
export function lerArquivo(nome: string, texto: string): Linha[] {
  if (!nome.toLowerCase().endsWith('.json')) return parseCsv(texto);
  const dados: unknown = JSON.parse(texto);
  if (!Array.isArray(dados)) throw new Error('O JSON precisa ser uma lista de registros.');
  return dados.map((item) =>
    Object.fromEntries(Object.entries(item as object).map(([k, v]) => [k, v == null ? '' : String(v)])),
  );
}

function campo(linha: Linha, ...nomes: string[]): string {
  const alvo = new Set(nomes.map(normalizar));
  for (const [k, v] of Object.entries(linha)) {
    if (alvo.has(normalizar(k))) return v;
  }
  return '';
}

function inteiro(v: string): number | null {
  const n = Number.parseInt(v.replace(/\D/g, ''), 10);
  return Number.isFinite(n) ? n : null;
}

export function detectarTipo(linhas: Linha[]): TipoImportacao | null {
  if (linhas.length === 0) return null;
  const colunas = new Set(Object.keys(linhas[0]).map(normalizar));
  const tem = (...n: string[]) => n.some((x) => colunas.has(normalizar(x)));
  if (tem('Projeto', 'project_nome', 'project_id') && tem('Responsável legal', 'Consentimento LGPD em', 'responsavel_legal_nome', 'idade')) return 'inscricoes';
  if (tem('Modalidade') && tem('Nome')) return 'projetos';
  if (tem('Nome', 'Contato')) return 'contatos';
  return null;
}

// ---- Formatos enviados ao servidor ---------------------------------

export const projetoImportSchema = z.strictObject({
  nome: z.string().trim().min(1).max(200),
  modalidade: z.string().max(80),
  objetivo: z.string().max(2000),
  status_mapa: z.string().max(40),
  bairro: z.string().max(120),
  endereco: z.string().max(300),
  dias_horarios: z.string().max(300),
  faixa_etaria: z.string().max(120),
  vagas: z.union([z.number().int().min(0), z.null()]),
  alunos_aprox: z.union([z.number().int().min(0), z.null()]),
  responsavel_nome: z.string().max(200),
  telefone_responsavel: z.string().max(40),
  contato_publico: z.string().max(200),
  observacoes_mapa: z.string().max(4000),
});
export type ProjetoImport = z.infer<typeof projetoImportSchema>;

export const contatoImportSchema = z.strictObject({
  nome: z.string().trim().min(1).max(200),
  telefone: z.string().max(40),
  email: z.string().max(200),
  funcao: z.string().max(200),
  organizacao: z.string().max(200),
  observacoes: z.string().max(4000),
});
export type ContatoImport = z.infer<typeof contatoImportSchema>;

/** Só totais: este formato não tem como carregar dado de pessoa. */
export const inscricoesImportSchema = z.strictObject({
  projeto: z.string().trim().min(1).max(200),
  total: z.number().int().min(0),
  novas: z.number().int().min(0),
  contatadas: z.number().int().min(0),
  matriculadas: z.number().int().min(0),
});
export type InscricoesImport = z.infer<typeof inscricoesImportSchema>;

export const importacaoSchema = z.discriminatedUnion('tipo', [
  z.strictObject({ tipo: z.literal('projetos'), registros: z.array(projetoImportSchema).max(MAX_LINHAS), criar_contatos: z.boolean() }),
  z.strictObject({ tipo: z.literal('contatos'), registros: z.array(contatoImportSchema).max(MAX_LINHAS) }),
  z.strictObject({ tipo: z.literal('inscricoes'), registros: z.array(inscricoesImportSchema).max(MAX_LINHAS) }),
]);
export type Importacao = z.infer<typeof importacaoSchema>;

// ---- Conversões ---------------------------------------------------

export function mapearProjetos(linhas: Linha[]): ProjetoImport[] {
  return linhas
    .map((l) => ({
      nome: campo(l, 'Nome', 'nome').slice(0, 200),
      modalidade: campo(l, 'Modalidade').slice(0, 80),
      objetivo: campo(l, 'Objetivo').slice(0, 2000),
      status_mapa: campo(l, 'Status').slice(0, 40),
      bairro: campo(l, 'Bairro').slice(0, 120),
      endereco: campo(l, 'Endereço', 'endereco').slice(0, 300),
      dias_horarios: campo(l, 'Dias e horários', 'dias_horarios').slice(0, 300),
      faixa_etaria: campo(l, 'Faixa etária', 'faixa_etaria').slice(0, 120),
      vagas: inteiro(campo(l, 'Vagas')),
      alunos_aprox: inteiro(campo(l, 'Alunos (aprox.)', 'alunos_aprox')),
      responsavel_nome: campo(l, 'Responsável', 'responsavel_nome').slice(0, 200),
      telefone_responsavel: campo(l, 'Telefone responsável', 'telefone_responsavel_privado').slice(0, 40),
      contato_publico: campo(l, 'Contato público', 'contato_publico').slice(0, 200),
      observacoes_mapa: campo(l, 'Observações internas', 'observacoes_internas').slice(0, 4000),
    }))
    .filter((p) => p.nome !== '');
}

export function mapearContatos(linhas: Linha[]): ContatoImport[] {
  return linhas
    .map((l) => ({
      nome: campo(l, 'Nome', 'Contato').slice(0, 200),
      telefone: campo(l, 'Telefone', 'Celular', 'WhatsApp', 'Fone').slice(0, 40),
      email: campo(l, 'E-mail', 'Email').slice(0, 200),
      funcao: campo(l, 'Função', 'Cargo', 'O que faz', 'Funcao').slice(0, 200),
      organizacao: campo(l, 'Organização', 'Empresa', 'Instituição', 'Organizacao', 'Órgão').slice(0, 200),
      observacoes: campo(l, 'Observações', 'Observação', 'Obs', 'Notas').slice(0, 4000),
    }))
    .filter((c) => c.nome !== '');
}

/** Reduz o CSV de inscrições a contagens por projeto, descartando tudo sobre as pessoas. */
export function agregarInscricoes(linhas: Linha[]): InscricoesImport[] {
  const porProjeto = new Map<string, InscricoesImport>();
  for (const l of linhas) {
    const projeto = campo(l, 'Projeto', 'project_nome').slice(0, 200);
    if (!projeto) continue;
    const atual = porProjeto.get(projeto) ?? { projeto, total: 0, novas: 0, contatadas: 0, matriculadas: 0 };
    atual.total += 1;
    const status = normalizar(campo(l, 'Status'));
    if (status === 'nova') atual.novas += 1;
    else if (status === 'contatada') atual.contatadas += 1;
    else if (status === 'matriculada') atual.matriculadas += 1;
    porProjeto.set(projeto, atual);
  }
  return [...porProjeto.values()];
}

/** O mesmo telefone é a mesma pessoa; sem telefone, vale o nome. Reimportar não duplica. */
export function contatoId(nome: string, telefone: string): string {
  const digitos = telefone.replace(/\D/g, '');
  return `c-${digitos.length >= 8 ? digitos : slug(nome)}`;
}

/** Importação só preenche o que está vazio: não desfaz o que a equipe editou. */
export function preencherVazios<T extends Record<string, unknown>>(existente: T | null, novo: Partial<T>): Partial<T> {
  if (!existente) return novo;
  const saida: Partial<T> = {};
  for (const k of Object.keys(novo) as (keyof T)[]) {
    const atual = existente[k];
    const v = novo[k];
    if ((atual === undefined || atual === null || atual === '') && v !== undefined && v !== null && v !== '') saida[k] = v;
  }
  return saida;
}
