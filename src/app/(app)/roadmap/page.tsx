'use client';

import { Map as IconeMapa, Plus } from 'lucide-react';
import { useMemo, useState } from 'react';
import { CAMPOS_ROADMAP } from '@/components/campos';
import { Formulario } from '@/components/Formulario';
import { Botao, CabecalhoPagina, Carregando, cx, Erro, Selo, type Tom, Vazio } from '@/components/ui';
import { useColecao, useEquipe } from '@/lib/client/hooks';
import { dataCurta, hojeISO, trimestreDe } from '@/lib/dates';
import { ROADMAP_STATUS, type RoadmapItem } from '@/lib/schema';

const TOM: Record<RoadmapItem['status'], Tom> = { planejado: 'neutro', em_andamento: 'info', concluido: 'marca', adiado: 'alerta' };

export default function PaginaRoadmap() {
  const hoje = hojeISO();
  const { itens, carregando, erro, criar, atualizar, remover, recarregar } = useColecao('roadmap');
  const { nomeDe } = useEquipe();
  const [editando, setEditando] = useState<Partial<RoadmapItem> | null>(null);
  const atual = trimestreDe(hoje).chave;

  const grupos = useMemo(() => {
    const mapa = new Map<string, { chave: string; rotulo: string; itens: RoadmapItem[] }>();
    for (const r of itens) {
      const data = r.fim ?? r.inicio;
      const g = data ? trimestreDe(data) : { chave: '9999', rotulo: 'Sem data' };
      if (!mapa.has(g.chave)) mapa.set(g.chave, { ...g, itens: [] });
      mapa.get(g.chave)!.itens.push(r);
    }
    for (const g of mapa.values()) g.itens.sort((a, b) => (a.fim ?? a.inicio ?? '').localeCompare(b.fim ?? b.inicio ?? ''));
    return [...mapa.values()].sort((a, b) => a.chave.localeCompare(b.chave));
  }, [itens]);

  return (
    <>
      <CabecalhoPagina
        titulo="Roadmap"
        descricao="Os grandes marcos do Joga Junto, organizados pelo trimestre em que devem ser concluídos."
        acoes={<Botao variante="primario" onClick={() => setEditando({})}><Plus size={16} aria-hidden /> Novo marco</Botao>}
      />
      {erro && <Erro mensagem={erro.message} aoTentar={() => void recarregar()} />}

      {carregando ? (
        <Carregando />
      ) : grupos.length === 0 && !erro ? (
        <Vazio icone={IconeMapa} titulo="O roadmap está vazio" descricao="Registre os marcos que a equipe quer alcançar nos próximos meses." acao={<Botao variante="primario" onClick={() => setEditando({})}>Adicionar o primeiro marco</Botao>} />
      ) : (
        <div className="-mx-4 overflow-x-auto px-4 pb-2 sm:-mx-6 sm:px-6">
          <ol className="flex min-w-max items-start gap-3">
            {grupos.map((g) => (
              <li key={g.chave} className="w-[300px] max-w-[82vw] shrink-0">
                <h2 className={cx('mb-2 flex items-center gap-2 border-b-2 pb-1.5 font-titulo text-xl leading-none font-semibold tracking-wide uppercase', g.chave === atual ? 'border-marca' : 'border-linha')}>
                  {g.rotulo}
                  {g.chave === atual && <Selo tom="marca">Agora</Selo>}
                </h2>
                <ul className="space-y-2">
                  {g.itens.map((r) => (
                    <li key={r.id}>
                      <button type="button" onClick={() => setEditando(r)} className="block w-full rounded-md border border-linha bg-painel p-3 text-left shadow-painel transition-colors hover:border-marca">
                        <p className="text-sm font-medium">{r.titulo}</p>
                        {r.descricao && <p className="mt-1 line-clamp-3 text-[13px] text-tinta-2">{r.descricao}</p>}
                        <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs text-tinta-2">
                          <Selo tom={TOM[r.status]}>{ROADMAP_STATUS[r.status]}</Selo>
                          {(r.inicio || r.fim) && <span>{[dataCurta(r.inicio, hoje), dataCurta(r.fim, hoje)].filter(Boolean).join(' a ')}</span>}
                        </div>
                        {r.responsavel && <p className="mt-1.5 text-xs text-tinta-2">{nomeDe(r.responsavel)}</p>}
                      </button>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ol>
        </div>
      )}

      {editando && (
        <Formulario
          titulo={editando.id ? 'Editar marco' : 'Novo marco'}
          campos={CAMPOS_ROADMAP}
          inicial={editando}
          aoFechar={() => setEditando(null)}
          aoSalvar={(v) => (editando.id ? atualizar(editando.id, v) : criar(v))}
          aoExcluir={editando.id ? () => remover(editando.id!) : undefined}
        />
      )}
    </>
  );
}
