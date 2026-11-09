import { CONTATO_CATEGORIA, EVENTO_TIPO, INFO_CATEGORIA, META_STATUS, PRIORIDADE, PROJETO_SITUACAO, ROADMAP_STATUS, TAREFA_STATUS } from '@/lib/schema';
import type { Campo } from './Formulario';

export const CAMPOS_TAREFA: Campo[] = [
  { nome: 'titulo', rotulo: 'O que precisa ser feito', tipo: 'texto', obrigatorio: true, largo: true },
  { nome: 'responsavel', rotulo: 'Quem vai fazer', tipo: 'membro' },
  { nome: 'pedido_por', rotulo: 'Quem pediu', tipo: 'membro' },
  { nome: 'contato_id', rotulo: 'Falar com (contato)', tipo: 'contato' },
  { nome: 'prazo', rotulo: 'Prazo', tipo: 'data' },
  { nome: 'status', rotulo: 'Situação', tipo: 'opcoes', opcoes: TAREFA_STATUS },
  { nome: 'prioridade', rotulo: 'Prioridade', tipo: 'opcoes', opcoes: PRIORIDADE, padrao: 'media' },
  { nome: 'projeto_id', rotulo: 'Projeto', tipo: 'projeto' },
  { nome: 'meta_id', rotulo: 'Meta', tipo: 'meta' },
  { nome: 'descricao', rotulo: 'Detalhes', tipo: 'area', largo: true },
];

export const CAMPOS_META: Campo[] = [
  { nome: 'titulo', rotulo: 'Objetivo', tipo: 'texto', obrigatorio: true, largo: true },
  { nome: 'valor_atual', rotulo: 'Valor atual', tipo: 'numero', obrigatorio: true },
  { nome: 'valor_alvo', rotulo: 'Valor alvo', tipo: 'numero' },
  { nome: 'unidade', rotulo: 'Unidade', tipo: 'texto', dica: 'Ex.: projetos, alunos, reais' },
  { nome: 'prazo', rotulo: 'Prazo', tipo: 'data' },
  { nome: 'responsavel', rotulo: 'Responsável', tipo: 'membro' },
  { nome: 'status', rotulo: 'Situação', tipo: 'opcoes', opcoes: META_STATUS },
  { nome: 'descricao', rotulo: 'Por que importa', tipo: 'area', largo: true },
];

export const CAMPOS_ROADMAP: Campo[] = [
  { nome: 'titulo', rotulo: 'Marco', tipo: 'texto', obrigatorio: true, largo: true },
  { nome: 'inicio', rotulo: 'Início', tipo: 'data' },
  { nome: 'fim', rotulo: 'Conclusão prevista', tipo: 'data' },
  { nome: 'status', rotulo: 'Situação', tipo: 'opcoes', opcoes: ROADMAP_STATUS },
  { nome: 'responsavel', rotulo: 'Responsável', tipo: 'membro' },
  { nome: 'meta_id', rotulo: 'Meta ligada', tipo: 'meta', largo: true },
  { nome: 'descricao', rotulo: 'Descrição', tipo: 'area', largo: true },
];

export const CAMPOS_EVENTO: Campo[] = [
  { nome: 'titulo', rotulo: 'Título', tipo: 'texto', obrigatorio: true, largo: true },
  { nome: 'data', rotulo: 'Data', tipo: 'data', obrigatorio: true },
  { nome: 'hora', rotulo: 'Hora', tipo: 'hora' },
  { nome: 'tipo', rotulo: 'Tipo', tipo: 'opcoes', opcoes: EVENTO_TIPO },
  { nome: 'responsavel', rotulo: 'Responsável', tipo: 'membro' },
  { nome: 'local', rotulo: 'Local', tipo: 'texto', largo: true },
  { nome: 'descricao', rotulo: 'Detalhes', tipo: 'area', largo: true },
];

export const CAMPOS_CONTATO: Campo[] = [
  { nome: 'nome', rotulo: 'Nome', tipo: 'texto', obrigatorio: true, largo: true },
  { nome: 'telefone', rotulo: 'Telefone', tipo: 'telefone' },
  { nome: 'email', rotulo: 'E-mail', tipo: 'email' },
  { nome: 'funcao', rotulo: 'O que a pessoa faz', tipo: 'texto' },
  { nome: 'organizacao', rotulo: 'Organização', tipo: 'texto' },
  { nome: 'categoria', rotulo: 'Categoria', tipo: 'opcoes', opcoes: CONTATO_CATEGORIA, padrao: 'outro' },
  { nome: 'responsavel', rotulo: 'Quem da equipe cuida', tipo: 'membro' },
  { nome: 'ultimo_contato', rotulo: 'Último contato', tipo: 'data' },
  { nome: 'proximo_contato', rotulo: 'Próximo contato', tipo: 'data' },
  { nome: 'observacoes', rotulo: 'Observações', tipo: 'area', largo: true },
];

export const CAMPOS_PROJETO: Campo[] = [
  { nome: 'nome', rotulo: 'Nome', tipo: 'texto', obrigatorio: true, largo: true },
  { nome: 'situacao', rotulo: 'Situação com o QG', tipo: 'opcoes', opcoes: PROJETO_SITUACAO },
  { nome: 'modalidade', rotulo: 'Modalidade', tipo: 'texto' },
  { nome: 'bairro', rotulo: 'Bairro', tipo: 'texto' },
  { nome: 'dias_horarios', rotulo: 'Dias e horários', tipo: 'texto' },
  { nome: 'faixa_etaria', rotulo: 'Faixa etária', tipo: 'texto' },
  { nome: 'alunos_aprox', rotulo: 'Alunos (aprox.)', tipo: 'numero' },
  { nome: 'vagas', rotulo: 'Vagas', tipo: 'numero' },
  { nome: 'responsavel_nome', rotulo: 'Responsável', tipo: 'texto' },
  { nome: 'telefone_responsavel', rotulo: 'Telefone do responsável', tipo: 'telefone' },
  { nome: 'endereco', rotulo: 'Endereço', tipo: 'texto', largo: true },
  { nome: 'observacoes_qg', rotulo: 'Observações da equipe', tipo: 'area', largo: true },
];

export const CAMPOS_INFORMACAO: Campo[] = [
  { nome: 'titulo', rotulo: 'Título', tipo: 'texto', obrigatorio: true, largo: true },
  { nome: 'categoria', rotulo: 'Categoria', tipo: 'opcoes', opcoes: INFO_CATEGORIA, padrao: 'contexto' },
  { nome: 'fixada', rotulo: 'Fixar no topo', tipo: 'booleano' },
  { nome: 'conteudo', rotulo: 'Conteúdo', tipo: 'area', largo: true, linhas: 10 },
];
