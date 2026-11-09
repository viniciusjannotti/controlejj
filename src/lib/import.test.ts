import { describe, expect, it } from 'vitest';
import { agregarInscricoes, contatoId, detectarTipo, importacaoSchema, lerArquivo, mapearContatos, mapearProjetos, parseCsv, preencherVazios } from './import';

// Mesmo formato do downloadCSV do Mapa Joga Junto: BOM, ponto e vírgula, CRLF.
const CSV_PROJETOS =
  '﻿Nome;Modalidade;Status;Bairro;Endereço;Dias e horários;Faixa etária;Vagas;Alunos (aprox.);Responsável;Telefone responsável;Contato público;Observações internas;Fonte;Cadastrado em\r\n' +
  'Projeto Um;Vôlei;aprovado;Centro;"Rua A; 10";Ter 18h;Todas as idades;15;40;Ana;(35) 90000-1111;;"Tem ""fila""\nde espera";site;01/02/2027\r\n' +
  ';Vôlei;aprovado;;;;;;;;;;;;\r\n';

const CSV_INSCRICOES =
  '﻿Projeto;Modalidade;Nome;Idade;Telefone;CEP;Bairro;Responsável legal;Telefone responsável legal;Status;Inscrito em;Consentimento LGPD em\r\n' +
  'Projeto Um;Vôlei;Criança Teste;11;35900001111;37550-000;Centro;Mãe Teste;35900002222;nova;01/02/2027;01/02/2027\r\n' +
  'Projeto Um;Vôlei;Outra Pessoa;30;35900003333;37550-000;Centro;;;matriculada;01/02/2027;01/02/2027\r\n' +
  'Projeto Dois;Lutas;Mais Alguém;20;35900004444;37550-000;Centro;;;contatada;01/02/2027;01/02/2027\r\n';

describe('parseCsv', () => {
  it('lê o formato do Joga Junto: BOM, ; , aspas e quebra de linha no campo', () => {
    const [linha] = parseCsv(CSV_PROJETOS);
    expect(linha['Nome']).toBe('Projeto Um');
    expect(linha['Endereço']).toBe('Rua A; 10');
    expect(linha['Observações internas']).toBe('Tem "fila"\nde espera');
  });

  it('aceita vírgula como separador', () => {
    expect(parseCsv('Nome,Telefone\nAna,123')).toEqual([{ Nome: 'Ana', Telefone: '123' }]);
  });

  it('não quebra com arquivo vazio', () => {
    expect(parseCsv('')).toEqual([]);
  });
});

describe('detectarTipo', () => {
  it('reconhece cada exportação', () => {
    expect(detectarTipo(parseCsv(CSV_PROJETOS))).toBe('projetos');
    expect(detectarTipo(parseCsv(CSV_INSCRICOES))).toBe('inscricoes');
    expect(detectarTipo(parseCsv('Nome;Telefone\nAna;1'))).toBe('contatos');
    expect(detectarTipo(parseCsv('Coluna;Outra\n1;2'))).toBeNull();
  });
});

describe('mapearProjetos', () => {
  it('converte campos e ignora linhas sem nome', () => {
    const projetos = mapearProjetos(parseCsv(CSV_PROJETOS));
    expect(projetos).toHaveLength(1);
    expect(projetos[0]).toMatchObject({ nome: 'Projeto Um', vagas: 15, alunos_aprox: 40, responsavel_nome: 'Ana', telefone_responsavel: '(35) 90000-1111', status_mapa: 'aprovado' });
  });

  it('aceita o JSON de seed, com os nomes de campo internos', () => {
    const json = JSON.stringify([{ nome: 'P', modalidade: 'Lutas', telefone_responsavel_privado: '123', alunos_aprox: 9, vagas: null }]);
    const [p] = mapearProjetos(lerArquivo('seed.json', json));
    expect(p).toMatchObject({ nome: 'P', telefone_responsavel: '123', alunos_aprox: 9, vagas: null });
  });
});

describe('agregarInscricoes', () => {
  const totais = agregarInscricoes(parseCsv(CSV_INSCRICOES));

  it('conta por projeto e status', () => {
    expect(totais).toEqual([
      { projeto: 'Projeto Um', total: 2, novas: 1, contatadas: 0, matriculadas: 1 },
      { projeto: 'Projeto Dois', total: 1, novas: 0, contatadas: 1, matriculadas: 0 },
    ]);
  });

  it('não deixa passar nenhum dado de pessoa', () => {
    const enviado = JSON.stringify(totais);
    for (const dado of ['Criança Teste', 'Mãe Teste', '35900001111', '35900002222', '37550']) expect(enviado).not.toContain(dado);
  });

  it('o servidor recusa inscrições com campos de pessoa', () => {
    const r = importacaoSchema.safeParse({ tipo: 'inscricoes', registros: [{ projeto: 'P', total: 1, novas: 1, contatadas: 0, matriculadas: 0, nome: 'Criança' }] });
    expect(r.success).toBe(false);
  });
});

describe('contatos', () => {
  it('mapeia cabeçalhos comuns', () => {
    const [c] = mapearContatos(parseCsv('Nome;Celular;E-mail;Cargo;Empresa;Obs\nAna;35 9;a@b.c;Gerente;ACME;gosta de café'));
    expect(c).toEqual({ nome: 'Ana', telefone: '35 9', email: 'a@b.c', funcao: 'Gerente', organizacao: 'ACME', observacoes: 'gosta de café' });
  });

  it('o id é estável: telefone identifica; sem telefone, o nome', () => {
    expect(contatoId('Ana', '(35) 90000-1111')).toBe(contatoId('Ana Maria', '35900001111'));
    expect(contatoId('José Silva', '')).toBe('c-jose-silva');
  });

  it('reimportar só preenche o que está vazio', () => {
    const existente = { nome: 'Ana', telefone: '', observacoes: 'editado pela equipe' };
    expect(preencherVazios(existente, { nome: 'Outro', telefone: '123', observacoes: 'do arquivo' })).toEqual({ telefone: '123' });
    expect(preencherVazios(null, { nome: 'Novo' })).toEqual({ nome: 'Novo' });
  });
});
