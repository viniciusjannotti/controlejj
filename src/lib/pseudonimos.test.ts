import { describe, expect, it } from 'vitest';
import { anonimizarTexto, criarPseudonimos, desanonimizar } from './pseudonimos';

const p = criarPseudonimos([
  { chave: 'ana@x.org', nome: 'Ana Souza', tipo: 'E' },
  { chave: 'voce@x.org', nome: 'Você (demonstração)', tipo: 'E' },
  { chave: 'c1', nome: 'João da Silva', tipo: 'C' },
  { chave: 'c2', nome: 'João Pereira', tipo: 'C' },
  { chave: 'c3', nome: 'Marina', tipo: 'C' },
  { chave: 'Treinador Fictício', nome: 'Treinador Fictício', tipo: 'R' },
]);

describe('criarPseudonimos', () => {
  it('numera por tipo e guarda o caminho de volta', () => {
    expect(p.codigoDe.get('ana@x.org')).toBe('E1');
    expect(p.codigoDe.get('c2')).toBe('C2');
    expect(p.chaveDe.get('C3')).toBe('c3');
    expect(p.nomes.R1).toBe('Treinador Fictício');
  });
});

describe('anonimizarTexto', () => {
  it('troca nome completo, sem diferenciar maiúsculas', () => {
    expect(anonimizarTexto('Ligar para JOÃO DA SILVA amanhã', p)).toBe('Ligar para [C1] amanhã');
  });

  it('troca primeiro nome só quando ele é de uma pessoa só', () => {
    expect(anonimizarTexto('A Ana e a Marina vão', p)).toBe('A [E1] e a [C3] vão');
    // Dois João cadastrados: "João" sozinho é ambíguo e fica.
    expect(anonimizarTexto('Falar com João', p)).toBe('Falar com João');
  });

  it('não confunde nome com pedaço de palavra', () => {
    expect(anonimizarTexto('Banana e Mariana', p)).toBe('Banana e Mariana');
  });

  it('não trata palavras comuns como nome', () => {
    expect(anonimizarTexto('Você viu o Treinador?', p)).toBe('Você viu o Treinador?');
  });

  it('remove telefones e e-mails em vários formatos', () => {
    const t = anonimizarTexto('Zap (35) 99999-1234, fixo 35 3421-0000, +55 35 912345678 ou mail fulano.tal@exemplo.com.br', p);
    expect(t).not.toMatch(/\d{4}/);
    expect(t).not.toContain('@');
  });

  it('não apaga datas, anos e números pequenos', () => {
    expect(anonimizarTexto('Meta de 2027: 10 projetos até 15/03', p)).toBe('Meta de 2027: 10 projetos até 15/03');
  });
});

describe('desanonimizar', () => {
  it('devolve os nomes e mantém códigos desconhecidos', () => {
    expect(desanonimizar('Fale com **[C1]** e [E1]; [C99] não existe', p.nomes)).toBe('Fale com **João da Silva** e Ana Souza; [C99] não existe');
  });
});
