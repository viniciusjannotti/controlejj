// ============================================================
// Modelo de dados do QG. Usado no servidor para validar toda
// escrita e no navegador para tipos e rótulos.
//
// Os campos não têm .default() de propósito: no Zod 4 um default
// dentro de .partial() seria aplicado também em PATCH e apagaria
// valores salvos. Os valores iniciais ficam em CREATE_DEFAULTS.
// ============================================================

import { z } from 'zod';

const texto = (max = 500) => z.string().trim().max(max);
const data = z.union([z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data inválida'), z.null()]);
const emailOuNulo = z.union([z.email().max(200), z.null()]);
const idOuNulo = z.union([z.string().min(1).max(200), z.null()]);

export const TAREFA_STATUS = { a_fazer: 'A fazer', em_andamento: 'Em andamento', aguardando: 'Aguardando', concluida: 'Concluída' } as const;
export const PRIORIDADE = { alta: 'Alta', media: 'Média', baixa: 'Baixa' } as const;
export const META_STATUS = { ativa: 'Ativa', pausada: 'Pausada', concluida: 'Concluída' } as const;
export const ROADMAP_STATUS = { planejado: 'Planejado', em_andamento: 'Em andamento', concluido: 'Concluído', adiado: 'Adiado' } as const;
export const EVENTO_TIPO = { reuniao: 'Reunião', deadline: 'Prazo', visita: 'Visita', evento: 'Evento' } as const;
export const CONTATO_CATEGORIA = {
  poder_publico: 'Poder público',
  patrocinador: 'Patrocinador',
  projeto_social: 'Projeto social',
  imprensa: 'Imprensa',
  comunidade: 'Comunidade',
  outro: 'Outro',
} as const;
export const PROJETO_SITUACAO = { a_mapear: 'A mapear', em_conversa: 'Em conversa', parceiro: 'Parceiro', inativo: 'Inativo' } as const;
export const INFO_CATEGORIA = { estrategia: 'Estratégia', reuniao: 'Reunião', contexto: 'Contexto', ideia: 'Ideia' } as const;

const enumDe = <T extends Record<string, string>>(o: T) => z.enum(Object.keys(o) as [keyof T & string, ...(keyof T & string)[]]);

const tarefa = z.strictObject({
  titulo: texto(200).min(1, 'Informe o título'),
  descricao: texto(4000),
  status: enumDe(TAREFA_STATUS),
  prioridade: enumDe(PRIORIDADE),
  responsavel: emailOuNulo,
  pedido_por: emailOuNulo,
  contato_id: idOuNulo,
  projeto_id: idOuNulo,
  meta_id: idOuNulo,
  prazo: data,
});

const meta = z.strictObject({
  titulo: texto(200).min(1, 'Informe o título'),
  descricao: texto(4000),
  status: enumDe(META_STATUS),
  unidade: texto(60),
  valor_atual: z.number().finite(),
  valor_alvo: z.union([z.number().finite().positive(), z.null()]),
  prazo: data,
  responsavel: emailOuNulo,
});

const roadmap = z.strictObject({
  titulo: texto(200).min(1, 'Informe o título'),
  descricao: texto(4000),
  status: enumDe(ROADMAP_STATUS),
  inicio: data,
  fim: data,
  responsavel: emailOuNulo,
  meta_id: idOuNulo,
});

const evento = z.strictObject({
  titulo: texto(200).min(1, 'Informe o título'),
  tipo: enumDe(EVENTO_TIPO),
  data: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Informe a data'),
  hora: z.union([z.string().regex(/^\d{2}:\d{2}$/), z.literal('')]),
  local: texto(200),
  descricao: texto(4000),
  responsavel: emailOuNulo,
});

const contato = z.strictObject({
  nome: texto(200).min(1, 'Informe o nome'),
  telefone: texto(40),
  email: texto(200),
  funcao: texto(200),
  organizacao: texto(200),
  categoria: enumDe(CONTATO_CATEGORIA),
  observacoes: texto(4000),
  responsavel: emailOuNulo,
  ultimo_contato: data,
  proximo_contato: data,
  origem: texto(60),
});

const projeto = z.strictObject({
  nome: texto(200).min(1, 'Informe o nome'),
  modalidade: texto(80),
  objetivo: texto(2000),
  status_mapa: texto(40),
  bairro: texto(120),
  endereco: texto(300),
  dias_horarios: texto(300),
  faixa_etaria: texto(120),
  vagas: z.union([z.number().int().min(0), z.null()]),
  alunos_aprox: z.union([z.number().int().min(0), z.null()]),
  responsavel_nome: texto(200),
  telefone_responsavel: texto(40),
  contato_publico: texto(200),
  observacoes_mapa: texto(4000),
  inscricoes_total: z.number().int().min(0),
  inscricoes_novas: z.number().int().min(0),
  inscricoes_contatadas: z.number().int().min(0),
  inscricoes_matriculadas: z.number().int().min(0),
  situacao: enumDe(PROJETO_SITUACAO),
  observacoes_qg: texto(4000),
});

const informacao = z.strictObject({
  titulo: texto(200).min(1, 'Informe o título'),
  conteudo: texto(20000),
  categoria: enumDe(INFO_CATEGORIA),
  fixada: z.boolean(),
});

export const SCHEMAS = { tarefas: tarefa, metas: meta, roadmap, eventos: evento, contatos: contato, projetos: projeto, informacoes: informacao };
export type Colecao = keyof typeof SCHEMAS;
export const COLECOES = Object.keys(SCHEMAS) as Colecao[];
export const isColecao = (v: string): v is Colecao => Object.prototype.hasOwnProperty.call(SCHEMAS, v);

type Base = { id: string; criado_em: string; criado_por: string; atualizado_em: string };
export type Tarefa = z.infer<typeof tarefa> & Base;
export type Meta = z.infer<typeof meta> & Base;
export type RoadmapItem = z.infer<typeof roadmap> & Base;
export type Evento = z.infer<typeof evento> & Base;
export type Contato = z.infer<typeof contato> & Base;
export type Projeto = z.infer<typeof projeto> & Base;
export type Informacao = z.infer<typeof informacao> & Base;

export interface DocumentosPorColecao {
  tarefas: Tarefa;
  metas: Meta;
  roadmap: RoadmapItem;
  eventos: Evento;
  contatos: Contato;
  projetos: Projeto;
  informacoes: Informacao;
}

const CREATE_DEFAULTS: { [C in Colecao]: Record<string, unknown> } = {
  tarefas: { descricao: '', status: 'a_fazer', prioridade: 'media', responsavel: null, pedido_por: null, contato_id: null, projeto_id: null, meta_id: null, prazo: null },
  metas: { descricao: '', status: 'ativa', unidade: '', valor_atual: 0, valor_alvo: null, prazo: null, responsavel: null },
  roadmap: { descricao: '', status: 'planejado', inicio: null, fim: null, responsavel: null, meta_id: null },
  eventos: { tipo: 'reuniao', hora: '', local: '', descricao: '', responsavel: null },
  contatos: { telefone: '', email: '', funcao: '', organizacao: '', categoria: 'outro', observacoes: '', responsavel: null, ultimo_contato: null, proximo_contato: null, origem: 'manual' },
  projetos: {
    modalidade: '', objetivo: '', status_mapa: '', bairro: '', endereco: '', dias_horarios: '', faixa_etaria: '', vagas: null, alunos_aprox: null,
    responsavel_nome: '', telefone_responsavel: '', contato_publico: '', observacoes_mapa: '',
    inscricoes_total: 0, inscricoes_novas: 0, inscricoes_contatadas: 0, inscricoes_matriculadas: 0, situacao: 'a_mapear', observacoes_qg: '',
  },
  informacoes: { conteudo: '', categoria: 'contexto', fixada: false },
};

/** Valida uma criação: exige o que não tem valor inicial e preenche o resto. */
export function parseCreate(colecao: Colecao, input: unknown) {
  const withDefaults = { ...CREATE_DEFAULTS[colecao], ...(typeof input === 'object' && input !== null ? input : {}) };
  return SCHEMAS[colecao].safeParse(withDefaults);
}

/** Valida uma edição: só os campos enviados, nunca campos de sistema. */
export function parsePatch(colecao: Colecao, input: unknown) {
  return SCHEMAS[colecao].partial().safeParse(input);
}

/** Só é aceito quando o servidor está em modo demonstração (ver isDemo). */
export const DEMO_TOKEN = 'modo-demonstracao';

export const MEMBRO_PAPEL = { admin: 'Administrador', membro: 'Membro' } as const;
export type Papel = keyof typeof MEMBRO_PAPEL;

export interface Membro {
  id: string; // e-mail em minúsculas
  email: string;
  nome: string;
  papel: Papel;
  foto?: string;
  primeiro_acesso?: string | null;
}

export const novoMembroSchema = z.strictObject({
  email: z.email().max(200).transform((e) => e.toLowerCase()),
  nome: texto(120),
  papel: z.enum(['admin', 'membro']),
});

export interface Atividade {
  id: string;
  acao: 'criou' | 'editou' | 'removeu' | 'importou';
  colecao: string;
  ref_id: string;
  titulo: string;
  ator: string;
  em: string;
}

/** Texto curto que identifica um documento em logs e na IA. */
export function tituloDe(doc: Record<string, unknown>): string {
  return String(doc.titulo ?? doc.nome ?? '').slice(0, 200);
}
