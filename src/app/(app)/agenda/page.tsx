'use client';

import { CalendarDays, CheckSquare, ChevronLeft, ChevronRight, ContactRound, Plus } from 'lucide-react';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { CAMPOS_EVENTO } from '@/components/campos';
import { Formulario } from '@/components/Formulario';
import { Botao, CabecalhoPagina, Carregando, cx, Erro, Painel, Selo, Vazio } from '@/components/ui';
import { useColecao, useEquipe } from '@/lib/client/hooks';
import { dataCurta, hojeISO, MESES_LONGOS } from '@/lib/dates';
import { EVENTO_TIPO, type Evento } from '@/lib/schema';

const DIAS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const iso = (a: number, m: number, d: number) => `${a}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

interface Item {
  id: string;
  tipo: 'evento' | 'tarefa' | 'contato';
  titulo: string;
  detalhe: string;
  evento?: Evento;
}

export default function PaginaAgenda() {
  const hoje = hojeISO();
  const eventos = useColecao('eventos');
  const tarefas = useColecao('tarefas');
  const contatos = useColecao('contatos');
  const { nomeDe } = useEquipe();

  const [ano, setAno] = useState(Number(hoje.slice(0, 4)));
  const [mes, setMes] = useState(Number(hoje.slice(5, 7)) - 1);
  const [dia, setDia] = useState(hoje);
  const [editando, setEditando] = useState<Partial<Evento> | null>(null);

  const porDia = useMemo(() => {
    const mapa = new Map<string, Item[]>();
    const add = (data: string, item: Item) => mapa.set(data, [...(mapa.get(data) ?? []), item]);
    for (const e of eventos.itens) add(e.data, { id: e.id, tipo: 'evento', titulo: e.titulo, detalhe: [EVENTO_TIPO[e.tipo], e.hora, e.local].filter(Boolean).join(' · '), evento: e });
    for (const t of tarefas.itens) {
      if (t.prazo && t.status !== 'concluida') add(t.prazo, { id: t.id, tipo: 'tarefa', titulo: t.titulo, detalhe: `Prazo de tarefa · ${nomeDe(t.responsavel) || 'sem responsável'}` });
    }
    for (const c of contatos.itens) {
      if (c.proximo_contato) add(c.proximo_contato, { id: c.id, tipo: 'contato', titulo: `Retomar com ${c.nome}`, detalhe: nomeDe(c.responsavel) || 'Contato' });
    }
    return mapa;
  }, [eventos.itens, tarefas.itens, contatos.itens, nomeDe]);

  const celulas = useMemo(() => {
    const inicio = new Date(Date.UTC(ano, mes, 1)).getUTCDay();
    const total = new Date(Date.UTC(ano, mes + 1, 0)).getUTCDate();
    return [...Array<null>(inicio).fill(null), ...Array.from({ length: total }, (_, i) => iso(ano, mes, i + 1))];
  }, [ano, mes]);

  function mudarMes(delta: number) {
    const d = new Date(Date.UTC(ano, mes + delta, 1));
    setAno(d.getUTCFullYear());
    setMes(d.getUTCMonth());
  }

  const doDia = porDia.get(dia) ?? [];
  const carregando = eventos.carregando || tarefas.carregando;

  return (
    <>
      <CabecalhoPagina
        titulo="Agenda"
        descricao="Reuniões e prazos da equipe, junto com os vencimentos de tarefas e os retornos a contatos."
        acoes={<Botao variante="primario" onClick={() => setEditando({ data: dia })}><Plus size={16} aria-hidden /> Novo compromisso</Botao>}
      />
      {eventos.erro && <Erro mensagem={eventos.erro.message} aoTentar={() => void eventos.recarregar()} />}

      {carregando ? (
        <Carregando />
      ) : (
        <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
          <Painel>
            <div className="flex items-center justify-between gap-2 border-b border-linha px-3 py-2">
              <Botao pequeno variante="fantasma" aria-label="Mês anterior" onClick={() => mudarMes(-1)}><ChevronLeft size={16} aria-hidden /></Botao>
              <h2 aria-live="polite" className="font-titulo text-xl leading-none font-semibold tracking-wide uppercase">{MESES_LONGOS[mes]} {ano}</h2>
              <Botao pequeno variante="fantasma" aria-label="Próximo mês" onClick={() => mudarMes(1)}><ChevronRight size={16} aria-hidden /></Botao>
            </div>
            <div className="grid grid-cols-7 border-b border-linha text-center text-[11px] font-semibold tracking-wide text-tinta-3 uppercase">
              {DIAS.map((d) => <div key={d} className="py-1.5">{d}</div>)}
            </div>
            <div className="grid grid-cols-7 [&>*]:min-w-0">
              {celulas.map((c, i) =>
                c === null ? (
                  <div key={`v${i}`} className="min-h-14 border-r border-b border-linha/60 bg-painel-2/40 md:min-h-24" />
                ) : (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setDia(c)}
                    aria-pressed={dia === c}
                    aria-label={`${dataCurta(c, hoje)}, ${(porDia.get(c) ?? []).length} itens`}
                    className={cx('flex min-h-14 flex-col gap-0.5 overflow-hidden border-r border-b border-linha/60 p-1 text-left transition-colors hover:bg-painel-2 md:min-h-24 md:p-1.5', dia === c && 'bg-marca-suave hover:bg-marca-suave')}
                  >
                    <span className={cx('inline-flex size-6 items-center justify-center rounded-full text-xs tabular-nums', c === hoje ? 'bg-marca font-semibold text-sobre-marca' : 'text-tinta-2')}>{Number(c.slice(8))}</span>
                    <span className="hidden space-y-0.5 md:block">
                      {(porDia.get(c) ?? []).slice(0, 2).map((it) => (
                        <span key={it.tipo + it.id} className="block truncate rounded bg-painel-2 px-1 text-[11px] leading-[18px] text-tinta">{it.titulo}</span>
                      ))}
                      {(porDia.get(c) ?? []).length > 2 && <span className="block px-1 text-[11px] text-tinta-3">+{(porDia.get(c) ?? []).length - 2}</span>}
                    </span>
                    {(porDia.get(c) ?? []).length > 0 && <span className="px-1 text-[10px] font-medium text-tinta-2 tabular-nums md:hidden">{(porDia.get(c) ?? []).length}</span>}
                  </button>
                ),
              )}
            </div>
          </Painel>

          <Painel titulo={dia === hoje ? 'Hoje' : dataCurta(dia, hoje)} acao={<Botao pequeno onClick={() => setEditando({ data: dia })}><Plus size={14} aria-hidden /> Adicionar</Botao>}>
            {doDia.length === 0 ? (
              <Vazio icone={CalendarDays} titulo="Nada neste dia" />
            ) : (
              <ul className="divide-y divide-linha">
                {doDia.map((it) => {
                  const conteudo = (
                    <>
                      <span className="mt-0.5 shrink-0 text-tinta-3">
                        {it.tipo === 'evento' ? <CalendarDays size={15} aria-hidden /> : it.tipo === 'tarefa' ? <CheckSquare size={15} aria-hidden /> : <ContactRound size={15} aria-hidden />}
                      </span>
                      <span className="min-w-0">
                        <span className="block text-sm font-medium">{it.titulo}</span>
                        <span className="block text-xs text-tinta-2">{it.detalhe}</span>
                        {it.evento?.tipo === 'deadline' && <Selo tom="alerta" className="mt-1">Prazo externo</Selo>}
                      </span>
                    </>
                  );
                  const classe = 'flex w-full items-start gap-2.5 px-4 py-2.5 text-left hover:bg-painel-2';
                  return (
                    <li key={it.tipo + it.id}>
                      {it.evento ? (
                        <button type="button" className={classe} onClick={() => setEditando(it.evento!)}>{conteudo}</button>
                      ) : (
                        <Link className={classe} href={it.tipo === 'tarefa' ? '/tarefas' : '/contatos'}>{conteudo}</Link>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </Painel>
        </div>
      )}

      {editando && (
        <Formulario
          titulo={editando.id ? 'Editar compromisso' : 'Novo compromisso'}
          campos={CAMPOS_EVENTO}
          inicial={editando}
          aoFechar={() => setEditando(null)}
          aoSalvar={(v) => (editando.id ? eventos.atualizar(editando.id, v) : eventos.criar(v))}
          aoExcluir={editando.id ? () => eventos.remover(editando.id!) : undefined}
        />
      )}
    </>
  );
}
