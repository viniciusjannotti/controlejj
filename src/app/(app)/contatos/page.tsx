'use client';

import { CheckSquare, ContactRound, Mail, MessageCircle, Pencil, Phone, PhoneCall, Plus } from 'lucide-react';
import { useMemo, useState } from 'react';
import { CAMPOS_CONTATO, CAMPOS_TAREFA } from '@/components/campos';
import { Formulario } from '@/components/Formulario';
import { Botao, Busca, CabecalhoPagina, Carregando, Erro, linkWhatsApp, Selo, Seletor, SeloPrazo, Vazio } from '@/components/ui';
import { useMembro } from '@/lib/client/auth';
import { useColecao, useEquipe } from '@/lib/client/hooks';
import { dataCurta, hojeISO } from '@/lib/dates';
import { CONTATO_CATEGORIA, type Contato } from '@/lib/schema';

const classeIcone = 'inline-flex size-9 items-center justify-center rounded-md border border-linha text-tinta-2 hover:bg-painel-2 hover:text-tinta';

export default function PaginaContatos() {
  const eu = useMembro();
  const hoje = hojeISO();
  const { itens, carregando, erro, criar, atualizar, remover, recarregar } = useColecao('contatos');
  const tarefas = useColecao('tarefas');
  const { nomeDe } = useEquipe();

  const [busca, setBusca] = useState('');
  const [categoria, setCategoria] = useState('');
  const [editando, setEditando] = useState<Partial<Contato> | null>(null);
  const [novaTarefa, setNovaTarefa] = useState<Contato | null>(null);
  const [erroAcao, setErroAcao] = useState('');

  const visiveis = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return itens
      .filter((c) => !categoria || c.categoria === categoria)
      .filter((c) => !q || [c.nome, c.funcao, c.organizacao, c.observacoes, c.telefone].join(' ').toLowerCase().includes(q))
      .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
  }, [itens, busca, categoria]);

  return (
    <>
      <CabecalhoPagina
        titulo="Contatos"
        descricao="Quem é útil para o projeto, o que faz, quem da equipe cuida da relação e quando retomar."
        acoes={<Botao variante="primario" onClick={() => setEditando({})}><Plus size={16} aria-hidden /> Novo contato</Botao>}
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Busca valor={busca} aoMudar={setBusca} rotulo="Buscar por nome, função ou organização" />
        <Seletor rotulo="Filtrar por categoria" valor={categoria} aoMudar={setCategoria} opcoes={[{ valor: '', rotulo: 'Todas as categorias' }, ...Object.entries(CONTATO_CATEGORIA).map(([valor, rotulo]) => ({ valor, rotulo }))]} />
        <span className="text-[13px] text-tinta-2 tabular-nums">{visiveis.length} de {itens.length}</span>
      </div>

      {erro && <Erro mensagem={erro.message} aoTentar={() => void recarregar()} />}
      {erroAcao && <div className="mb-3"><Erro mensagem={erroAcao} /></div>}

      {carregando ? (
        <Carregando />
      ) : itens.length === 0 && !erro ? (
        <Vazio icone={ContactRound} titulo="Nenhum contato ainda" descricao="Cadastre aqui ou traga os responsáveis pelos projetos na tela Importar." acao={<Botao variante="primario" onClick={() => setEditando({})}>Cadastrar contato</Botao>} />
      ) : visiveis.length === 0 ? (
        <Vazio icone={ContactRound} titulo="Nenhum contato com esse filtro" />
      ) : (
        <ul className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {visiveis.map((c) => {
            const wa = c.telefone ? linkWhatsApp(c.telefone) : null;
            return (
              <li key={c.id} className="flex flex-col rounded-lg border border-linha bg-painel p-4 shadow-painel">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <button type="button" onClick={() => setEditando(c)} className="text-left font-medium hover:underline">{c.nome}</button>
                    <p className="text-[13px] text-tinta-2">{[c.funcao, c.organizacao].filter(Boolean).join(' · ') || 'Sem função cadastrada'}</p>
                  </div>
                  <Selo className="shrink-0">{CONTATO_CATEGORIA[c.categoria]}</Selo>
                </div>

                {c.observacoes && <p className="mt-2 line-clamp-3 text-[13px] whitespace-pre-line text-tinta-2">{c.observacoes}</p>}

                <div className="mt-2 mb-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-tinta-2">
                  {c.telefone && <span className="tabular-nums">{c.telefone}</span>}
                  {c.responsavel && <span>Com {nomeDe(c.responsavel)}</span>}
                  {c.ultimo_contato && <span>Último contato {dataCurta(c.ultimo_contato, hoje)}</span>}
                  {c.proximo_contato && <span className="inline-flex items-center gap-1">Retomar <SeloPrazo data={c.proximo_contato} /></span>}
                </div>

                <div className="mt-auto flex flex-wrap items-center gap-1.5 border-t border-linha pt-3">
                  {wa && <a href={wa} target="_blank" rel="noopener noreferrer" className={classeIcone} aria-label={`WhatsApp de ${c.nome}`} title="WhatsApp"><MessageCircle size={16} aria-hidden /></a>}
                  {c.telefone && <a href={`tel:${c.telefone.replace(/[^\d+]/g, '')}`} className={classeIcone} aria-label={`Ligar para ${c.nome}`} title="Ligar"><Phone size={16} aria-hidden /></a>}
                  {c.email && <a href={`mailto:${c.email}`} className={classeIcone} aria-label={`E-mail para ${c.nome}`} title="E-mail"><Mail size={16} aria-hidden /></a>}
                  <span className="ml-auto flex flex-wrap gap-1.5">
                    <Botao pequeno onClick={() => setEditando(c)}><Pencil size={14} aria-hidden /> Editar</Botao>
                    <Botao
                      pequeno
                      onClick={() => {
                        setErroAcao('');
                        atualizar(c.id, { ultimo_contato: hoje }).catch((e: Error) => setErroAcao(e.message));
                      }}
                    >
                      <PhoneCall size={14} aria-hidden /> Falei hoje
                    </Botao>
                    <Botao pequeno onClick={() => setNovaTarefa(c)}><CheckSquare size={14} aria-hidden /> Criar tarefa</Botao>
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {editando && (
        <Formulario
          titulo={editando.id ? 'Editar contato' : 'Novo contato'}
          campos={CAMPOS_CONTATO}
          inicial={editando}
          aoFechar={() => setEditando(null)}
          aoSalvar={(v) => (editando.id ? atualizar(editando.id, v) : criar(v))}
          aoExcluir={editando.id ? () => remover(editando.id!) : undefined}
        />
      )}
      {novaTarefa && (
        <Formulario
          titulo={`Tarefa: ${novaTarefa.nome}`}
          campos={CAMPOS_TAREFA}
          inicial={{ contato_id: novaTarefa.id, responsavel: novaTarefa.responsavel, pedido_por: eu.email, titulo: `Falar com ${novaTarefa.nome}` }}
          aoFechar={() => setNovaTarefa(null)}
          aoSalvar={(v) => tarefas.criar(v)}
        />
      )}
    </>
  );
}
