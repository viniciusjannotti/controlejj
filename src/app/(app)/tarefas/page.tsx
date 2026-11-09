'use client';

import { CheckSquare, Plus } from 'lucide-react';
import { type DragEvent, useMemo, useState } from 'react';
import { CAMPOS_TAREFA } from '@/components/campos';
import { Formulario } from '@/components/Formulario';
import { Avatar, Botao, Busca, CabecalhoPagina, Carregando, cx, Erro, Selo, Seletor, SeloPrazo, Vazio } from '@/components/ui';
import { useMembro } from '@/lib/client/auth';
import { useColecao, useEquipe } from '@/lib/client/hooks';
import { PRIORIDADE, TAREFA_STATUS, type Tarefa } from '@/lib/schema';

const COLUNAS = Object.entries(TAREFA_STATUS) as [Tarefa['status'], string][];
const PESO = { alta: 0, media: 1, baixa: 2 };

export default function PaginaTarefas() {
  const eu = useMembro();
  const { itens, carregando, erro, criar, atualizar, remover, recarregar } = useColecao('tarefas');
  const contatos = useColecao('contatos');
  const projetos = useColecao('projetos');
  const { membros, nomeDe } = useEquipe();

  const [busca, setBusca] = useState('');
  const [pessoa, setPessoa] = useState('');
  const [projeto, setProjeto] = useState('');
  const [editando, setEditando] = useState<Partial<Tarefa> | null>(null);
  const [sobre, setSobre] = useState<string | null>(null);
  const [erroMover, setErroMover] = useState('');

  const visiveis = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return itens
      .filter((t) => (pessoa === '' ? true : pessoa === 'sem' ? !t.responsavel : t.responsavel === pessoa))
      .filter((t) => !projeto || t.projeto_id === projeto)
      .filter((t) => !q || `${t.titulo} ${t.descricao}`.toLowerCase().includes(q))
      .sort((a, b) => (a.prazo ?? '9999').localeCompare(b.prazo ?? '9999') || PESO[a.prioridade] - PESO[b.prioridade]);
  }, [itens, busca, pessoa, projeto]);

  function soltar(e: DragEvent, status: Tarefa['status']) {
    e.preventDefault();
    setSobre(null);
    const id = e.dataTransfer.getData('text/plain');
    const tarefa = itens.find((t) => t.id === id);
    if (tarefa && tarefa.status !== status) {
      setErroMover('');
      atualizar(id, { status }).catch((err: Error) => setErroMover(err.message));
    }
  }

  return (
    <>
      <CabecalhoPagina
        titulo="Tarefas"
        descricao="Quem faz o quê, para quem e até quando. Arraste um cartão entre as colunas ou abra para editar."
        acoes={
          <Botao variante="primario" onClick={() => setEditando({ pedido_por: eu.email })}>
            <Plus size={16} aria-hidden /> Nova tarefa
          </Botao>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Busca valor={busca} aoMudar={setBusca} rotulo="Buscar tarefa" />
        <Seletor
          rotulo="Filtrar por responsável"
          valor={pessoa}
          aoMudar={setPessoa}
          opcoes={[{ valor: '', rotulo: 'Todos os responsáveis' }, { valor: eu.email, rotulo: 'Só as minhas' }, { valor: 'sem', rotulo: 'Sem responsável' }, ...membros.filter((m) => m.email !== eu.email).map((m) => ({ valor: m.email, rotulo: m.nome }))]}
        />
        <Seletor rotulo="Filtrar por projeto" valor={projeto} aoMudar={setProjeto} opcoes={[{ valor: '', rotulo: 'Todos os projetos' }, ...projetos.itens.map((p) => ({ valor: p.id, rotulo: p.nome }))]} />
      </div>

      {erro && <Erro mensagem={erro.message} aoTentar={() => void recarregar()} />}
      {erroMover && <div className="mb-3"><Erro mensagem={erroMover} /></div>}

      {carregando ? (
        <Carregando />
      ) : itens.length === 0 && !erro ? (
        <Vazio icone={CheckSquare} titulo="Nenhuma tarefa ainda" descricao="Comece pelo próximo passo mais importante do projeto." acao={<Botao variante="primario" onClick={() => setEditando({ pedido_por: eu.email })}>Criar a primeira tarefa</Botao>} />
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
          {COLUNAS.map(([status, rotulo]) => {
            const daColuna = visiveis.filter((t) => t.status === status);
            return (
              <section
                key={status}
                aria-label={rotulo}
                onDragOver={(e) => { e.preventDefault(); setSobre(status); }}
                onDragLeave={() => setSobre(null)}
                onDrop={(e) => soltar(e, status)}
                className={cx('rounded-lg border bg-painel-2/60 p-2 transition-colors', sobre === status ? 'border-marca' : 'border-transparent')}
              >
                <h2 className="mb-2 flex items-center justify-between px-1.5 pt-1 font-titulo text-lg leading-none font-semibold tracking-wide uppercase">
                  {rotulo}
                  <span className="font-sans text-xs font-medium text-tinta-2 tabular-nums">{daColuna.length}</span>
                </h2>
                <ul className="space-y-2">
                  {daColuna.map((t) => {
                    const contato = contatos.itens.find((c) => c.id === t.contato_id);
                    const proj = projetos.itens.find((p) => p.id === t.projeto_id);
                    const concluida = t.status === 'concluida';
                    return (
                      <li key={t.id}>
                        <button
                          type="button"
                          draggable
                          onDragStart={(e) => e.dataTransfer.setData('text/plain', t.id)}
                          onClick={() => setEditando(t)}
                          className="block w-full rounded-md border border-linha bg-painel p-3 text-left shadow-painel transition-colors hover:border-marca"
                        >
                          <p className={cx('text-sm font-medium', concluida && 'text-tinta-2 line-through')}>{t.titulo}</p>
                          {(contato || proj) && (
                            <p className="mt-1 truncate text-xs text-tinta-2">
                              {contato && `Falar com ${contato.nome}`}
                              {contato && proj && ' · '}
                              {proj?.nome}
                            </p>
                          )}
                          <div className="mt-2 flex flex-wrap items-center gap-1.5">
                            {t.prioridade === 'alta' && !concluida && <Selo tom="alerta">Prioridade {PRIORIDADE.alta.toLowerCase()}</Selo>}
                            <SeloPrazo data={t.prazo} concluido={concluida} />
                            <span className="ml-auto flex items-center gap-1.5 text-xs text-tinta-2">
                              {t.responsavel ? (
                                <>
                                  <Avatar nome={nomeDe(t.responsavel)} pequeno />
                                  <span className="max-w-24 truncate">{nomeDe(t.responsavel).split(' ')[0]}</span>
                                </>
                              ) : (
                                'Sem responsável'
                              )}
                            </span>
                          </div>
                        </button>
                      </li>
                    );
                  })}
                  {daColuna.length === 0 && <li className="px-1.5 py-3 text-center text-xs text-tinta-3">Nada aqui</li>}
                </ul>
              </section>
            );
          })}
        </div>
      )}

      {editando && (
        <Formulario
          titulo={editando.id ? 'Editar tarefa' : 'Nova tarefa'}
          campos={CAMPOS_TAREFA}
          inicial={editando}
          aoFechar={() => setEditando(null)}
          aoSalvar={(v) => (editando.id ? atualizar(editando.id, v) : criar(v))}
          aoExcluir={editando.id ? () => remover(editando.id!) : undefined}
        />
      )}
    </>
  );
}
