import { describe, expect, it } from 'vitest';
import { desanonimizar } from '@/lib/pseudonimos';
import type { Atividade, Contato, Informacao, Projeto, Tarefa } from '@/lib/schema';
import { type DadosQG, montarFoto, normalizarProposta, pseudonimosDe } from './ai-context';

const base = { criado_em: '2027-01-01', criado_por: 'a@b.c', atualizado_em: '2027-01-01' };
const contato = {
  ...base, id: 'c1', nome: 'Pessoa Teste', telefone: '35911112222', email: 'pessoa@teste.local', funcao: 'Gestora',
  organizacao: 'Org', categoria: 'outro', observacoes: 'Falar com Pessoa Teste pelo 35 98888-7777', responsavel: 'a@b.c', ultimo_contato: null, proximo_contato: null, origem: 'manual',
} as Contato;
const projeto = { ...base, id: 'p1', nome: 'Projeto X', responsavel_nome: 'Fulano Responsável', telefone_responsavel: '35933334444', contato_publico: 'publico@teste.local', objetivo: '', observacoes_qg: 'Fulano Responsável pediu bolas' } as Projeto;
const tarefa = (o: Partial<Tarefa>) => ({ ...base, id: 't', titulo: 'T', descricao: '', status: 'a_fazer', prioridade: 'media', responsavel: null, pedido_por: null, contato_id: null, projeto_id: null, meta_id: null, prazo: null, ...o }) as Tarefa;

const dados = (o: Partial<DadosQG> = {}): DadosQG => ({
  equipe: [{ id: 'a@b.c', email: 'a@b.c', nome: 'Ana Equipe', papel: 'admin' }],
  tarefas: [tarefa({ id: 'x', titulo: 'Ligar para Pessoa Teste', responsavel: 'a@b.c', contato_id: 'c1' })],
  metas: [], roadmap: [], eventos: [], contatos: [contato], projetos: [projeto],
  informacoes: [{ ...base, id: 'i', titulo: 'Reunião', conteudo: 'Ana Equipe ficou de falar com Fulano Responsável. Email fulano@x.com', categoria: 'reuniao', fixada: false } as Informacao],
  atividade: [{ id: 'a', acao: 'criou', colecao: 'tarefas', ref_id: 'x', titulo: 'Ligar para Pessoa Teste', ator: 'Ana Equipe', em: '2027-01-01' } as Atividade],
  ...o,
});

describe('montarFoto', () => {
  const d = dados();
  const p = pseudonimosDe(d);
  const foto = montarFoto(d, '2027-01-10', p);

  it('não envia nenhum nome, telefone ou e-mail de pessoa', () => {
    for (const dado of ['Pessoa Teste', 'Ana Equipe', 'Fulano', '35911112222', '98888', '35933334444', 'pessoa@teste.local', 'publico@teste.local', 'a@b.c', 'fulano@x.com']) {
      expect(foto).not.toContain(dado);
    }
  });

  it('usa códigos que voltam aos nomes', () => {
    const tarefas = JSON.parse(foto).tarefas;
    expect(tarefas[0]).toMatchObject({ titulo: 'Ligar para [C1]', responsavel: 'E1', contato: 'C1' });
    expect(desanonimizar(tarefas[0].titulo, p.nomes)).toBe('Ligar para Pessoa Teste');
    expect(JSON.parse(foto).projetos[0].responsavel).toBe('R1');
  });

  it('calcula dias de atraso só para tarefa aberta', () => {
    const d2 = dados({ tarefas: [tarefa({ id: 'a', prazo: '2027-01-07' }), tarefa({ id: 'b', prazo: '2027-01-07', status: 'concluida' })] });
    const t = JSON.parse(montarFoto(d2, '2027-01-10', pseudonimosDe(d2))).tarefas;
    expect(t.map((x: { dias_de_atraso: number }) => x.dias_de_atraso)).toEqual([3, 0]);
  });

  it('limita o volume de tarefas concluídas, mantendo as abertas', () => {
    const concluidas = Array.from({ length: 50 }, (_, i) => tarefa({ id: `c${i}`, status: 'concluida' }));
    const d2 = dados({ tarefas: [tarefa({ id: 'aberta', titulo: 'aberta' }), ...concluidas] });
    const t = JSON.parse(montarFoto(d2, '2027-01-10', pseudonimosDe(d2))).tarefas;
    expect(t).toHaveLength(31);
    expect(t[0].titulo).toBe('aberta');
  });
});

describe('normalizarProposta', () => {
  const d = dados();
  const p = pseudonimosDe(d);
  const ok = { titulo: 'Ligar para [C1]', justificativa: 'porque sim', prioridade: 'alta', responsavel: 'E1', prazo: '2027-02-01', contato: '[C1]', projeto_id: 'p1' };

  it('traduz códigos de volta para e-mail e id', () => {
    expect(normalizarProposta(ok, p, d)).toEqual({ titulo: 'Ligar para [C1]', justificativa: 'porque sim', prioridade: 'alta', responsavel: 'a@b.c', prazo: '2027-02-01', contato_id: 'c1', projeto_id: 'p1' });
  });

  it('descarta códigos, ids e datas inventados', () => {
    const r = normalizarProposta({ ...ok, responsavel: 'E9', contato: 'C1x', projeto_id: 'nao', prazo: 'amanhã' }, p, d);
    expect(r).toMatchObject({ responsavel: null, contato_id: null, projeto_id: null, prazo: null });
  });

  it('não aceita contato no lugar de responsável da equipe', () => {
    expect(normalizarProposta({ ...ok, responsavel: 'C1' }, p, d)?.responsavel).toBeNull();
  });

  it('rejeita entrada inválida ou incompleta', () => {
    expect(normalizarProposta({ titulo: 'só isso' }, p, d)).toBeNull();
    expect(normalizarProposta({ ...ok, titulo: '  ' }, p, d)).toBeNull();
    expect(normalizarProposta({ ...ok, prioridade: 'urgente' }, p, d)).toBeNull();
  });
});
