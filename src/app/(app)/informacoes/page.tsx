'use client';

import { BookOpen, Pin, Plus } from 'lucide-react';
import { useMemo, useState } from 'react';
import { CAMPOS_INFORMACAO } from '@/components/campos';
import { Formulario } from '@/components/Formulario';
import { Botao, Busca, CabecalhoPagina, Carregando, Erro, Selo, Vazio } from '@/components/ui';
import { useColecao } from '@/lib/client/hooks';
import { INFO_CATEGORIA, type Informacao } from '@/lib/schema';

export default function PaginaInformacoes() {
  const { itens, carregando, erro, criar, atualizar, remover, recarregar } = useColecao('informacoes');
  const [busca, setBusca] = useState('');
  const [editando, setEditando] = useState<Partial<Informacao> | null>(null);

  const visiveis = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return itens
      .filter((i) => !q || `${i.titulo} ${i.conteudo}`.toLowerCase().includes(q))
      .sort((a, b) => Number(b.fixada) - Number(a.fixada) || b.atualizado_em.localeCompare(a.atualizado_em));
  }, [itens, busca]);

  return (
    <>
      <CabecalhoPagina
        titulo="Informações"
        descricao="Decisões, atas e contexto do projeto. O conselheiro de IA lê tudo o que estiver aqui para fundamentar as sugestões."
        acoes={<Botao variante="primario" onClick={() => setEditando({})}><Plus size={16} aria-hidden /> Nova informação</Botao>}
      />
      <div className="mb-4"><Busca valor={busca} aoMudar={setBusca} rotulo="Buscar nas informações" /></div>
      {erro && <Erro mensagem={erro.message} aoTentar={() => void recarregar()} />}

      {carregando ? (
        <Carregando />
      ) : itens.length === 0 && !erro ? (
        <Vazio icone={BookOpen} titulo="Nada registrado ainda" descricao="Comece com o que a equipe sempre precisa explicar: objetivo do projeto, decisões tomadas, resultado da última reunião." acao={<Botao variante="primario" onClick={() => setEditando({})}>Registrar a primeira</Botao>} />
      ) : visiveis.length === 0 ? (
        <Vazio icone={BookOpen} titulo="Nada encontrado para essa busca" />
      ) : (
        <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {visiveis.map((i) => (
            <li key={i.id}>
              <button type="button" onClick={() => setEditando(i)} className="block h-full w-full rounded-lg border border-linha bg-painel p-4 text-left shadow-painel transition-colors hover:border-marca">
                <span className="flex items-center gap-2">
                  {i.fixada && <Pin size={14} className="shrink-0 text-tinta-2" aria-label="Fixada" />}
                  <span className="min-w-0 flex-1 font-medium">{i.titulo}</span>
                  <Selo className="shrink-0">{INFO_CATEGORIA[i.categoria]}</Selo>
                </span>
                <span className="mt-1.5 line-clamp-4 block text-[13px] whitespace-pre-line text-tinta-2">{i.conteudo}</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {editando && (
        <Formulario
          titulo={editando.id ? 'Editar informação' : 'Nova informação'}
          campos={CAMPOS_INFORMACAO}
          inicial={editando}
          aoFechar={() => setEditando(null)}
          aoSalvar={(v) => (editando.id ? atualizar(editando.id, v) : criar(v))}
          aoExcluir={editando.id ? () => remover(editando.id!) : undefined}
        />
      )}
    </>
  );
}
