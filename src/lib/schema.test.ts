import { describe, expect, it } from 'vitest';
import { hojeISO, prazoRelativo, somarDias, trimestreDe } from './dates';
import { isColecao, parseCreate, parsePatch } from './schema';

describe('parseCreate', () => {
  it('preenche valores iniciais', () => {
    const r = parseCreate('tarefas', { titulo: 'Ligar' });
    expect(r.success && r.data).toMatchObject({ titulo: 'Ligar', status: 'a_fazer', prioridade: 'media', prazo: null });
  });

  it('exige título', () => {
    expect(parseCreate('tarefas', { titulo: '  ' }).success).toBe(false);
    expect(parseCreate('tarefas', {}).success).toBe(false);
  });

  it('recusa campos de sistema e desconhecidos', () => {
    expect(parseCreate('tarefas', { titulo: 'x', criado_por: 'alguem' }).success).toBe(false);
    expect(parseCreate('tarefas', { titulo: 'x', id: 'outro' }).success).toBe(false);
  });

  it('recusa status, data e e-mail inválidos', () => {
    expect(parseCreate('tarefas', { titulo: 'x', status: 'feito' }).success).toBe(false);
    expect(parseCreate('tarefas', { titulo: 'x', prazo: '12/03/2027' }).success).toBe(false);
    expect(parseCreate('tarefas', { titulo: 'x', responsavel: 'não é email' }).success).toBe(false);
  });
});

describe('parsePatch', () => {
  it('altera só o que foi enviado, sem repor valores iniciais', () => {
    const r = parsePatch('tarefas', { status: 'concluida' });
    expect(r.success && r.data).toEqual({ status: 'concluida' });
  });

  it('recusa campos de sistema', () => {
    expect(parsePatch('tarefas', { criado_em: 'ontem' }).success).toBe(false);
  });
});

describe('isColecao', () => {
  it('bloqueia equipe, atividade e nomes herdados de Object', () => {
    expect(isColecao('tarefas')).toBe(true);
    for (const nome of ['equipe', 'atividade', 'constructor', '__proto__']) expect(isColecao(nome)).toBe(false);
  });
});

describe('datas', () => {
  it('usa o dia de Pouso Alegre, não o de UTC', () => {
    expect(hojeISO(new Date('2027-01-11T02:00:00Z'))).toBe('2027-01-10');
  });

  it('soma dias atravessando o mês', () => {
    expect(somarDias('2027-01-30', 3)).toBe('2027-02-02');
  });

  it('descreve prazos', () => {
    expect(prazoRelativo('2027-01-07', '2027-01-10')).toEqual({ texto: '3 dias de atraso', tom: 'atrasado' });
    expect(prazoRelativo('2027-01-10', '2027-01-10').texto).toBe('Hoje');
    expect(prazoRelativo('2027-01-11', '2027-01-10').texto).toBe('Amanhã');
  });

  it('agrupa por trimestre', () => {
    expect(trimestreDe('2027-04-01').rotulo).toBe('2027 · T2');
    expect(trimestreDe('2027-12-31').rotulo).toBe('2027 · T4');
  });
});
