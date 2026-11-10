'use client';

import { FolderKanban, Pencil, Plus, Upload } from 'lucide-react';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { CAMPOS_PROJETO } from '@/components/campos';
import { Formulario } from '@/components/Formulario';
import { Botao, Busca, CabecalhoPagina, Carregando, Erro, Selo, Seletor, type Tom, Vazio } from '@/components/ui';
import { useColecao } from '@/lib/client/hooks';
import { PROJETO_SITUACAO, type Projeto } from '@/lib/schema';

const TOM: Record<Projeto['situacao'], Tom> = { a_mapear: 'neutro', em_conversa: 'info', parceiro: 'marca', inativo: 'alerta' };

export default function PaginaProjetos() {
  const { itens, carregando, erro, criar, atualizar, remover, recarregar } = useColecao('projetos');
  const tarefas = useColecao('tarefas');
  const [busca, setBusca] = useState('');
  const [situacao, setSituacao] = useState('');
  const [modalidade, setModalidade] = useState('');
  const [editando, setEditando] = useState<Partial<Projeto> | null>(null);

  const modalidades = useMemo(() => [...new Set(itens.map((p) => p.modalidade).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'pt-BR')), [itens]);
  const visiveis = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return itens
      .filter((p) => !situacao || p.situacao === situacao)
      .filter((p) => !modalidade || p.modalidade === modalidade)
      .filter((p) => !q || [p.nome, p.bairro, p.responsavel_nome, p.observacoes_qg].join(' ').toLowerCase().includes(q))
      .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
  }, [itens, busca, situacao, modalidade]);

  return (
    <>
      <CabecalhoPagina
        titulo="Projetos"
        descricao="Os projetos sociais sob o guarda-chuva do Joga Junto e como está a relação com cada um."
        acoes={
          <>
            <Link href="/importar" className="inline-flex min-h-10 items-center gap-1.5 rounded-md border border-linha bg-painel px-3.5 text-sm font-medium hover:bg-painel-2">
              <Upload size={15} aria-hidden /> Importar do mapa
            </Link>
            <Botao variante="primario" onClick={() => setEditando({})}><Plus size={16} aria-hidden /> Novo projeto</Botao>
          </>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Busca valor={busca} aoMudar={setBusca} rotulo="Buscar por nome, bairro ou responsável" />
        <Seletor rotulo="Filtrar por situação" valor={situacao} aoMudar={setSituacao} opcoes={[{ valor: '', rotulo: 'Todas as situações' }, ...Object.entries(PROJETO_SITUACAO).map(([valor, rotulo]) => ({ valor, rotulo }))]} />
        <Seletor rotulo="Filtrar por modalidade" valor={modalidade} aoMudar={setModalidade} opcoes={[{ valor: '', rotulo: 'Todas as modalidades' }, ...modalidades.map((m) => ({ valor: m, rotulo: m }))]} />
      </div>

      {erro && <Erro mensagem={erro.message} aoTentar={() => void recarregar()} />}

      {carregando ? (
        <Carregando />
      ) : itens.length === 0 && !erro ? (
        <Vazio icone={FolderKanban} titulo="Nenhum projeto na base" descricao="Exporte o CSV de projetos no painel do Mapa Joga Junto e importe aqui." acao={<Link href="/importar" className="text-sm font-medium text-marca hover:underline">Ir para Importar</Link>} />
      ) : visiveis.length === 0 ? (
        <Vazio icone={FolderKanban} titulo="Nenhum projeto com esse filtro" />
      ) : (
        <ul className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {visiveis.map((p) => {
            const abertas = tarefas.itens.filter((t) => t.projeto_id === p.id && t.status !== 'concluida').length;
            return (
              <li key={p.id}>
                <button type="button" onClick={() => setEditando(p)} className="flex h-full w-full flex-col rounded-lg border border-linha bg-painel p-4 text-left shadow-painel transition-colors hover:border-marca">
                  <span className="flex items-start justify-between gap-2">
                    <span className="min-w-0 font-medium">{p.nome}</span>
                    <Selo tom={TOM[p.situacao]} className="shrink-0">{PROJETO_SITUACAO[p.situacao]}</Selo>
                  </span>
                  <span className="mt-0.5 text-[13px] text-tinta-2">{[p.modalidade, p.bairro].filter(Boolean).join(' · ')}</span>
                  {p.responsavel_nome && <span className="mt-0.5 text-[13px] text-tinta-2">Responsável: {p.responsavel_nome}</span>}
                  {p.observacoes_qg && <span className="mt-2 line-clamp-2 text-[13px] text-tinta-2">{p.observacoes_qg}</span>}
                  <span className="mt-auto grid grid-cols-3 gap-2 pt-3 text-center">
                    {[
                      { r: 'Alunos', v: p.alunos_aprox ?? '–' },
                      { r: 'Vagas', v: p.vagas ?? '–' },
                      { r: 'Inscrições', v: p.inscricoes_total },
                    ].map((x) => (
                      <span key={x.r} className="rounded bg-painel-2 py-1.5">
                        <span className="block font-titulo text-xl leading-none font-semibold tabular-nums">{x.v}</span>
                        <span className="text-[11px] text-tinta-2">{x.r}</span>
                      </span>
                    ))}
                  </span>
                  <span className="mt-3 flex items-center justify-between gap-2 text-xs">
                    <span className="text-tinta-2">{abertas > 0 && `${abertas} ${abertas === 1 ? 'tarefa aberta' : 'tarefas abertas'}`}</span>
                    <span className="inline-flex items-center gap-1 font-medium text-marca"><Pencil size={12} aria-hidden /> Editar</span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {editando && (
        <Formulario
          titulo={editando.id ? 'Editar projeto' : 'Novo projeto'}
          campos={CAMPOS_PROJETO}
          inicial={editando}
          aoFechar={() => setEditando(null)}
          aoSalvar={(v) => (editando.id ? atualizar(editando.id, v) : criar(v))}
          aoExcluir={editando.id ? () => remover(editando.id!) : undefined}
        />
      )}
    </>
  );
}
