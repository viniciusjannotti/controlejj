'use client';

import { CalendarDays, Check, CheckCircle2, ContactRound, Sparkles, Target } from 'lucide-react';
import Link from 'next/link';
import { type ReactNode, useMemo, useState } from 'react';
import { Avatar, Carregando, cx, Erro, Painel, Progresso, Seletor, SeloPrazo, Vazio } from '@/components/ui';
import { useMembro } from '@/lib/client/auth';
import { useAtividade, useColecao, useEquipe } from '@/lib/client/hooks';
import { dataCurta, hojeISO, MESES_LONGOS, somarDias } from '@/lib/dates';
import { CONTATO_CATEGORIA, EVENTO_TIPO } from '@/lib/schema';

function Indicador({ rotulo, valor, detalhe, href, atencao }: { rotulo: string; valor: ReactNode; detalhe: string; href: string; atencao?: boolean }) {
  return (
    <Link href={href} className="group rounded-lg border border-linha bg-painel p-4 shadow-painel transition-colors hover:border-marca">
      <p className="text-[13px] font-medium text-tinta-2">{rotulo}</p>
      <p className={cx('mt-1 font-titulo text-[44px] leading-none font-bold tabular-nums', atencao && 'text-perigo')}>{valor}</p>
      <p className="mt-1.5 text-xs text-tinta-3">{detalhe}</p>
    </Link>
  );
}

const VERBOS = { criou: 'criou', editou: 'atualizou', removeu: 'removeu', importou: 'importou' };

export default function PaginaPainel() {
  const eu = useMembro();
  const hoje = hojeISO();
  const tarefas = useColecao('tarefas');
  const metas = useColecao('metas');
  const eventos = useColecao('eventos');
  const contatos = useColecao('contatos');
  const projetos = useColecao('projetos');
  const { nomeDe } = useEquipe();
  const atividade = useAtividade();
  const [escopo, setEscopo] = useState('equipe');

  const abertas = useMemo(() => tarefas.itens.filter((t) => t.status !== 'concluida'), [tarefas.itens]);
  const atrasadas = abertas.filter((t) => t.prazo && t.prazo < hoje);
  const semana = abertas.filter((t) => t.prazo && t.prazo >= hoje && t.prazo <= somarDias(hoje, 7));
  const foco = abertas
    .filter((t) => t.prazo && t.prazo <= somarDias(hoje, 7))
    .filter((t) => escopo === 'equipe' || t.responsavel === eu.email)
    .sort((a, b) => (a.prazo ?? '').localeCompare(b.prazo ?? ''))
    .slice(0, 8);
  const retomar = contatos.itens
    .filter((c) => c.proximo_contato && c.proximo_contato <= somarDias(hoje, 7))
    .sort((a, b) => (a.proximo_contato ?? '').localeCompare(b.proximo_contato ?? ''));
  const proximos = eventos.itens
    .filter((e) => e.data >= hoje)
    .sort((a, b) => `${a.data}${a.hora}`.localeCompare(`${b.data}${b.hora}`))
    .slice(0, 5);
  const metasAtivas = metas.itens.filter((m) => m.status === 'ativa');
  const parceiros = projetos.itens.filter((p) => p.situacao === 'parceiro').length;

  if (tarefas.erro) return <Erro mensagem={tarefas.erro.message} aoTentar={() => void tarefas.recarregar()} />;
  if (tarefas.carregando) return <Carregando />;

  const [, m, d] = hoje.split('-').map(Number);

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm text-tinta-2">{d} de {MESES_LONGOS[m - 1].toLowerCase()}</p>
          <h1 className="font-titulo text-[32px] leading-none font-bold tracking-wide uppercase">Olá, {eu.nome.split(' ')[0]}</h1>
        </div>
        <Link href="/ia" className="inline-flex min-h-10 items-center gap-1.5 rounded-md bg-marca px-3.5 text-sm font-medium text-sobre-marca hover:bg-marca-forte">
          <Sparkles size={15} aria-hidden /> Perguntar ao conselheiro
        </Link>
      </header>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Indicador rotulo="Tarefas atrasadas" valor={atrasadas.length} detalhe={atrasadas.length ? 'Precisam de decisão' : 'Nenhuma pendência vencida'} href="/tarefas" atencao={atrasadas.length > 0} />
        <Indicador rotulo="Vencem em 7 dias" valor={semana.length} detalhe={`${abertas.length} tarefas abertas no total`} href="/tarefas" />
        <Indicador rotulo="Contatos a retomar" valor={retomar.length} detalhe="Com retorno previsto até 7 dias" href="/contatos" />
        <Indicador rotulo="Projetos parceiros" valor={parceiros} detalhe={`De ${projetos.itens.length} projetos na base`} href="/projetos" />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Painel
          titulo="Foco da semana"
          className="lg:col-span-2"
          acao={<Seletor rotulo="Mostrar tarefas de" valor={escopo} aoMudar={setEscopo} opcoes={[{ valor: 'equipe', rotulo: 'Toda a equipe' }, { valor: 'minhas', rotulo: 'Só as minhas' }]} />}
        >
          {foco.length === 0 ? (
            <Vazio icone={CheckCircle2} titulo="Nada vencendo nos próximos 7 dias" descricao="Bom momento para olhar as metas e planejar o próximo passo." />
          ) : (
            <ul className="divide-y divide-linha">
              {foco.map((t) => {
                const contato = contatos.itens.find((c) => c.id === t.contato_id);
                return (
                  <li key={t.id} className="flex items-center gap-3 px-4 py-2.5">
                    <button
                      type="button"
                      aria-label={`Concluir: ${t.titulo}`}
                      title="Marcar como concluída"
                      onClick={() => void tarefas.atualizar(t.id, { status: 'concluida' })}
                      className="group -m-2 flex size-9 shrink-0 items-center justify-center rounded-full"
                    >
                      <span className="flex size-5 items-center justify-center rounded-full border border-tinta-3 group-hover:border-marca group-hover:bg-marca-suave">
                        <Check size={12} aria-hidden className="text-marca opacity-0 group-hover:opacity-100" />
                      </span>
                    </button>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{t.titulo}</p>
                      <p className="truncate text-xs text-tinta-2">
                        {nomeDe(t.responsavel) || 'Sem responsável'}
                        {contato && ` fala com ${contato.nome}`}
                      </p>
                    </div>
                    <SeloPrazo data={t.prazo} />
                  </li>
                );
              })}
            </ul>
          )}
        </Painel>

        <Painel titulo="Próximos compromissos" acao={<Link href="/agenda" className="text-[13px] text-marca hover:underline">Agenda</Link>}>
          {proximos.length === 0 ? (
            <Vazio icone={CalendarDays} titulo="Agenda livre" />
          ) : (
            <ul className="divide-y divide-linha">
              {proximos.map((e) => (
                <li key={e.id} className="flex gap-3 px-4 py-2.5">
                  <span className="w-14 shrink-0 text-xs font-medium text-tinta-2 tabular-nums">{dataCurta(e.data, hoje)}</span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{e.titulo}</p>
                    <p className="text-xs text-tinta-2">{EVENTO_TIPO[e.tipo]}{e.hora && ` às ${e.hora}`}{e.local && ` · ${e.local}`}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Painel>

        <Painel titulo="Metas" className="lg:col-span-2" acao={<Link href="/metas" className="text-[13px] text-marca hover:underline">Ver todas</Link>}>
          {metasAtivas.length === 0 ? (
            <Vazio icone={Target} titulo="Nenhuma meta ativa" acao={<Link href="/metas" className="text-sm text-marca hover:underline">Definir a primeira meta</Link>} />
          ) : (
            <ul className="divide-y divide-linha">
              {metasAtivas.slice(0, 5).map((m2) => (
                <li key={m2.id} className="px-4 py-3">
                  <div className="mb-1.5 flex items-baseline justify-between gap-3">
                    <p className="min-w-0 truncate text-sm font-medium">{m2.titulo}</p>
                    <p className="shrink-0 text-[13px] text-tinta-2 tabular-nums">
                      {m2.valor_atual.toLocaleString('pt-BR')}
                      {m2.valor_alvo !== null && ` de ${m2.valor_alvo.toLocaleString('pt-BR')}`} {m2.unidade}
                    </p>
                  </div>
                  <Progresso valor={m2.valor_atual} alvo={m2.valor_alvo} rotulo={m2.titulo} />
                </li>
              ))}
            </ul>
          )}
        </Painel>

        <Painel titulo="Retomar contato" acao={<Link href="/contatos" className="text-[13px] text-marca hover:underline">Contatos</Link>}>
          {retomar.length === 0 ? (
            <Vazio icone={ContactRound} titulo="Nenhum retorno previsto" />
          ) : (
            <ul className="divide-y divide-linha">
              {retomar.slice(0, 5).map((c) => (
                <li key={c.id} className="flex items-center gap-3 px-4 py-2.5">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{c.nome}</p>
                    <p className="truncate text-xs text-tinta-2">{c.organizacao || CONTATO_CATEGORIA[c.categoria]}</p>
                  </div>
                  <SeloPrazo data={c.proximo_contato} />
                </li>
              ))}
            </ul>
          )}
        </Painel>
      </div>

      {atividade.length > 0 && (
        <Painel titulo="Últimas movimentações">
          <ul className="divide-y divide-linha">
            {atividade.slice(0, 6).map((a) => (
              <li key={a.id} className="flex items-center gap-2.5 px-4 py-2 text-[13px]">
                <Avatar nome={a.ator} pequeno />
                <p className="min-w-0 flex-1 truncate text-tinta-2">
                  <span className="font-medium text-tinta">{a.ator}</span> {VERBOS[a.acao]} “{a.titulo}”
                </p>
              </li>
            ))}
          </ul>
        </Painel>
      )}
    </div>
  );
}
