// Dados 100% fictícios para o modo demonstração. Pessoas, telefones e
// projetos abaixo foram inventados e não existem no Firestore de produção.

import { hojeISO, somarDias } from '@/lib/dates';

type Banco = Record<string, Record<string, Record<string, unknown>>>;

const VOCE = 'voce@demo.local';
const BIA = 'bia@demo.local';
const CAIO = 'caio@demo.local';

export function criarDadosDemo(): Banco {
  const hoje = hojeISO();
  const d = (n: number) => somarDias(hoje, n);
  const ts = `${hoje}T12:00:00.000Z`;
  const base = { criado_em: ts, atualizado_em: ts, criado_por: VOCE };
  const com = (o: Record<string, unknown>) => ({ ...base, ...o });

  const tarefa = (titulo: string, status: string, prioridade: string, responsavel: string, prazo: string | null, extra: Record<string, unknown> = {}) =>
    com({ titulo, status, prioridade, responsavel, prazo, descricao: '', pedido_por: VOCE, contato_id: null, projeto_id: null, meta_id: null, ...extra });

  const contato = (nome: string, funcao: string, organizacao: string, categoria: string, telefone: string, observacoes: string, responsavel: string, ultimo: string | null, proximo: string | null) =>
    com({ nome, funcao, organizacao, categoria, telefone, email: '', observacoes, responsavel, ultimo_contato: ultimo, proximo_contato: proximo, origem: 'demo' });

  const projeto = (nome: string, modalidade: string, bairro: string, responsavel_nome: string, alunos: number, vagas: number, situacao: string, inscricoes: number, matriculadas: number, observacoes_qg: string) =>
    com({
      nome, modalidade, bairro, responsavel_nome, alunos_aprox: alunos, vagas, situacao, observacoes_qg,
      objetivo: '', status_mapa: 'aprovado', endereco: '', dias_horarios: 'Ter e qui, 18h', faixa_etaria: 'Crianças (até 12 anos)',
      telefone_responsavel: '(35) 90000-0000', contato_publico: '', observacoes_mapa: '',
      inscricoes_total: inscricoes, inscricoes_novas: inscricoes - matriculadas, inscricoes_contatadas: 0, inscricoes_matriculadas: matriculadas,
    });

  return {
    equipe: {
      [BIA]: { email: BIA, nome: 'Bia Exemplo', papel: 'membro' },
      [CAIO]: { email: CAIO, nome: 'Caio Exemplo', papel: 'membro' },
    },
    contatos: {
      c1: contato('Marina Fictícia', 'Secretária de esportes', 'Prefeitura (exemplo)', 'poder_publico', '(35) 90000-0001', 'Prefere reunião presencial pela manhã. Abriu a porta para falar do edital de 2027.', VOCE, d(-40), d(-5)),
      c2: contato('Rafael Inventado', 'Gerente de marketing', 'Empresa Exemplo Ltda', 'patrocinador', '(35) 90000-0002', 'Interessado em patrocinar uniformes; pediu números de alunos atendidos.', BIA, d(-12), d(3)),
      c3: contato('Lúcia Modelo', 'Coordenadora de projeto', 'Vôlei no Bairro (exemplo)', 'projeto_social', '(35) 90000-0003', 'Conhece todos os treinadores da região sul.', CAIO, d(-3), null),
      c4: contato('Pedro Amostra', 'Repórter', 'Rádio Exemplo FM', 'imprensa', '(35) 90000-0004', 'Topa cobrir a primeira ação conjunta.', BIA, null, d(10)),
    },
    projetos: {
      p1: projeto('Vôlei no Bairro (exemplo)', 'Vôlei', 'Centro', 'Lúcia Modelo', 45, 15, 'parceiro', 22, 15, 'Primeiro parceiro formal.'),
      p2: projeto('Tatame Aberto (exemplo)', 'Lutas', 'Jardim Exemplo', 'Treinador Fictício', 30, 0, 'em_conversa', 14, 6, 'Sem vagas e com fila de espera; precisa de espaço maior.'),
      p3: projeto('Bola na Rede (exemplo)', 'Futebol e futsal', 'Vila Modelo', 'Responsável Fictício', 80, 20, 'a_mapear', 3, 1, ''),
    },
    tarefas: {
      t1: tarefa('Enviar ofício para a Secretaria de Esportes', 'em_andamento', 'alta', VOCE, d(-3), { contato_id: 'c1', descricao: 'Pedir pauta para apresentar o Joga Junto e tratar do edital.' }),
      t2: tarefa('Ligar para o Rafael com os números de alunos', 'a_fazer', 'alta', BIA, d(2), { contato_id: 'c2', pedido_por: VOCE }),
      t3: tarefa('Visitar o Tatame Aberto e entender a fila de espera', 'a_fazer', 'media', CAIO, d(5), { projeto_id: 'p2' }),
      t4: tarefa('Fechar o modelo de termo de parceria', 'aguardando', 'media', VOCE, d(9), { descricao: 'Aguardando revisão do advogado voluntário.' }),
      t5: tarefa('Atualizar a lista de projetos do mapa', 'concluida', 'baixa', CAIO, d(-6)),
      t6: tarefa('Convidar a Rádio para a ação conjunta', 'a_fazer', 'baixa', BIA, null, { contato_id: 'c4' }),
    },
    metas: {
      m1: com({ titulo: 'Projetos parceiros formalizados', descricao: '', status: 'ativa', unidade: 'projetos', valor_atual: 1, valor_alvo: 10, prazo: d(120), responsavel: VOCE }),
      m2: com({ titulo: 'Alunos matriculados pelo mapa', descricao: '', status: 'ativa', unidade: 'alunos', valor_atual: 22, valor_alvo: 100, prazo: d(200), responsavel: CAIO }),
      m3: com({ titulo: 'Patrocinadores confirmados', descricao: '', status: 'ativa', unidade: 'empresas', valor_atual: 0, valor_alvo: 3, prazo: d(90), responsavel: BIA }),
    },
    roadmap: {
      r1: com({ titulo: 'Mapear todos os projetos da cidade', descricao: 'Base completa no mapa público.', status: 'em_andamento', inicio: d(-30), fim: d(30), responsavel: CAIO, meta_id: null }),
      r2: com({ titulo: 'Primeira rodada de parcerias', descricao: 'Termo assinado com ao menos cinco projetos.', status: 'planejado', inicio: d(30), fim: d(110), responsavel: VOCE, meta_id: 'm1' }),
      r3: com({ titulo: 'Festival Joga Junto', descricao: 'Evento aberto reunindo os projetos parceiros.', status: 'planejado', inicio: d(120), fim: d(210), responsavel: BIA, meta_id: null }),
    },
    eventos: {
      e1: com({ titulo: 'Reunião semanal da equipe', tipo: 'reuniao', data: d(1), hora: '19:00', local: 'On-line', descricao: '', responsavel: VOCE }),
      e2: com({ titulo: 'Prazo do edital municipal', tipo: 'deadline', data: d(18), hora: '', local: '', descricao: 'Data de exemplo.', responsavel: VOCE }),
      e3: com({ titulo: 'Visita ao Tatame Aberto', tipo: 'visita', data: d(5), hora: '18:00', local: 'Jardim Exemplo', descricao: '', responsavel: CAIO }),
    },
    informacoes: {
      i1: com({ titulo: 'O que é o Joga Junto', conteudo: 'Projeto guarda-chuva que reúne projetos sociais de esporte em Pouso Alegre (MG).', categoria: 'contexto', fixada: true }),
      i2: com({ titulo: 'Prioridade do semestre (exemplo)', conteudo: 'Formalizar parcerias antes de buscar patrocínio grande: patrocinador pede número de projetos.', categoria: 'estrategia', fixada: true }),
    },
    documentos: {
      d1: com({
        titulo: 'Edital de apoio ao esporte (exemplo fictício)',
        categoria: 'edital',
        resumo: 'Como os projetos pedem verba para materiais, uniformes e transporte.',
        link: '',
        nome_arquivo: 'edital-exemplo.pdf',
        texto: [
          'EDITAL DE APOIO AO ESPORTE COMUNITÁRIO (documento fictício para demonstração)',
          '1. Quem pode participar: projetos sociais esportivos com pelo menos um ano de atividade comprovada.',
          '2. Valor: cada projeto pode pedir até R$ 20.000,00 para materiais esportivos, uniformes e transporte de alunos.',
          '3. Documentos exigidos: estatuto ou ata de fundação, comprovante de CNPJ, lista de alunos atendidos (sem dados pessoais) e plano de trabalho.',
          '4. Passo a passo da inscrição: (a) baixar o formulário no site da secretaria; (b) preencher o plano de trabalho com metas e orçamento; (c) reunir os documentos; (d) protocolar tudo na secretaria.',
          `5. Prazo: as propostas devem ser protocoladas até ${d(18)}.`,
          '6. Prestação de contas: notas fiscais de todas as compras e relatório final com fotos das atividades.',
        ].join('\n\n'),
      }),
    },
    atividade: {},
  };
}
