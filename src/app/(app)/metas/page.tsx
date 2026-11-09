'use client';

import { Minus, Plus, Target } from 'lucide-react';
import { useState } from 'react';
import { CAMPOS_META } from '@/components/campos';
import { Formulario } from '@/components/Formulario';
import { Botao, CabecalhoPagina, Carregando, Erro, Progresso, Selo, SeloPrazo, Vazio } from '@/components/ui';
import { useColecao, useEquipe } from '@/lib/client/hooks';
import { META_STATUS, type Meta } from '@/lib/schema';

const ORDEM = { ativa: 0, pausada: 1, concluida: 2 };

export default function PaginaMetas() {
  const { itens, carregando, erro, criar, atualizar, remover, recarregar } = useColecao('metas');
  const tarefas = useColecao('tarefas');
  const { nomeDe } = useEquipe();
  const [editando, setEditando] = useState<Partial<Meta> | null>(null);
  const [erroAjuste, setErroAjuste] = useState('');

  const metas = [...itens].sort((a, b) => ORDEM[a.status] - ORDEM[b.status] || (a.prazo ?? '9999').localeCompare(b.prazo ?? '9999'));

  const ajustar = (m: Meta, delta: number) => {
    setErroAjuste('');
    atualizar(m.id, { valor_atual: m.valor_atual + delta }).catch((e: Error) => setErroAjuste(e.message));
  };

  return (
    <>
      <CabecalhoPagina
        titulo="Metas"
        descricao="Os objetivos que orientam a equipe, com um número para saber se estão andando."
        acoes={<Botao variante="primario" onClick={() => setEditando({})}><Plus size={16} aria-hidden /> Nova meta</Botao>}
      />
      {erro && <Erro mensagem={erro.message} aoTentar={() => void recarregar()} />}
      {erroAjuste && <div className="mb-3"><Erro mensagem={erroAjuste} /></div>}

      {carregando ? (
        <Carregando />
      ) : metas.length === 0 && !erro ? (
        <Vazio icone={Target} titulo="Nenhuma meta definida" descricao="Exemplo: 10 projetos parceiros formalizados até o fim do semestre." acao={<Botao variante="primario" onClick={() => setEditando({})}>Definir a primeira meta</Botao>} />
      ) : (
        <ul className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {metas.map((m) => {
            const abertas = tarefas.itens.filter((t) => t.meta_id === m.id && t.status !== 'concluida').length;
            const pct = m.valor_alvo ? Math.round((m.valor_atual / m.valor_alvo) * 100) : null;
            return (
              <li key={m.id} className="flex flex-col rounded-lg border border-linha bg-painel p-4 shadow-painel">
                <div className="mb-3 flex items-start justify-between gap-2">
                  <button type="button" onClick={() => setEditando(m)} className="min-w-0 text-left font-medium hover:underline">{m.titulo}</button>
                  {m.status !== 'ativa' && <Selo tom={m.status === 'concluida' ? 'marca' : 'neutro'}>{META_STATUS[m.status]}</Selo>}
                </div>
                <p className="font-titulo text-[40px] leading-none font-bold tabular-nums">
                  {m.valor_atual.toLocaleString('pt-BR')}
                  {m.valor_alvo !== null && <span className="text-2xl font-semibold text-tinta-3"> / {m.valor_alvo.toLocaleString('pt-BR')}</span>}
                </p>
                <p className="mt-1 mb-2.5 text-xs text-tinta-2">
                  {m.unidade}
                  {pct !== null && ` · ${pct}% do alvo`}
                </p>
                <Progresso valor={m.valor_atual} alvo={m.valor_alvo} rotulo={m.titulo} />
                {m.descricao && <p className="mt-3 line-clamp-2 text-[13px] text-tinta-2">{m.descricao}</p>}
                <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-linha pt-3">
                  <SeloPrazo data={m.prazo} concluido={m.status === 'concluida'} />
                  <span className="min-w-0 truncate text-xs text-tinta-2">
                    {nomeDe(m.responsavel) || 'Sem responsável'}
                    {abertas > 0 && ` · ${abertas} ${abertas === 1 ? 'tarefa aberta' : 'tarefas abertas'}`}
                  </span>
                  <span className="ml-auto flex gap-1">
                    <Botao pequeno aria-label={`Diminuir 1 em ${m.titulo}`} onClick={() => ajustar(m, -1)} disabled={m.valor_atual <= 0}><Minus size={14} aria-hidden /></Botao>
                    <Botao pequeno aria-label={`Somar 1 em ${m.titulo}`} onClick={() => ajustar(m, 1)}><Plus size={14} aria-hidden /></Botao>
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {editando && (
        <Formulario
          titulo={editando.id ? 'Editar meta' : 'Nova meta'}
          campos={CAMPOS_META}
          inicial={editando}
          aoFechar={() => setEditando(null)}
          aoSalvar={(v) => (editando.id ? atualizar(editando.id, v) : criar(v))}
          aoExcluir={editando.id ? () => remover(editando.id!) : undefined}
        />
      )}
    </>
  );
}
