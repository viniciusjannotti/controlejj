'use client';

import { ExternalLink, FileText, FileUp, Pencil, Plus, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { type ChangeEvent, type FormEvent, useEffect, useMemo, useState } from 'react';
import { Botao, Busca, CabecalhoPagina, Carregando, Erro, Modal, Selo, Seletor, Vazio } from '@/components/ui';
import { api } from '@/lib/client/api';
import { extrairTexto } from '@/lib/client/extrair';
import { useColecao } from '@/lib/client/hooks';
import { dataCurta } from '@/lib/dates';
import { DOC_CATEGORIA, type Documento, MAX_TEXTO_DOCUMENTO } from '@/lib/schema';

type Categoria = keyof typeof DOC_CATEGORIA;

const tamanho = (caracteres: number) => {
  // ~3.000 caracteres por página de texto corrido.
  const paginas = Math.max(1, Math.round(caracteres / 3000));
  return `${caracteres.toLocaleString('pt-BR')} caracteres · cerca de ${paginas} ${paginas === 1 ? 'página' : 'páginas'}`;
};

/**
 * Criação e edição no mesmo lugar. O texto fica sempre visível e editável:
 * enviar um arquivo só preenche (ou substitui) o texto, que pode ser corrigido antes de salvar.
 */
function JanelaDocumento({
  doc,
  aoFechar,
  aoSalvar,
  aoExcluir,
}: {
  doc: Documento | null;
  aoFechar: () => void;
  aoSalvar: (v: Record<string, unknown>) => Promise<unknown>;
  aoExcluir?: () => Promise<unknown>;
}) {
  const editando = Boolean(doc);
  const [carregandoTexto, setCarregandoTexto] = useState(editando);
  const [texto, setTexto] = useState('');
  const [nomeArquivo, setNomeArquivo] = useState(doc?.nome_arquivo ?? '');
  const [avisos, setAvisos] = useState<string[]>([]);
  const [lendo, setLendo] = useState(false);
  const [titulo, setTitulo] = useState(doc?.titulo ?? '');
  const [categoria, setCategoria] = useState<Categoria>(doc?.categoria ?? 'passo_a_passo');
  const [resumo, setResumo] = useState(doc?.resumo ?? '');
  const [link, setLink] = useState(doc?.link ?? '');
  const [erro, setErro] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [confirmando, setConfirmando] = useState(false);

  // Na edição, a lista não traz o texto: busca o documento completo.
  useEffect(() => {
    if (!doc) return;
    let ativo = true;
    api<Documento>(`/api/data/documentos/${encodeURIComponent(doc.id)}`).then(
      (d) => {
        if (!ativo) return;
        setTexto(d.texto ?? '');
        setCarregandoTexto(false);
      },
      (e: Error) => {
        if (!ativo) return;
        setErro(e.message);
        setCarregandoTexto(false);
      },
    );
    return () => {
      ativo = false;
    };
  }, [doc]);

  async function escolher(e: ChangeEvent<HTMLInputElement>) {
    const arquivo = e.target.files?.[0];
    e.target.value = '';
    if (!arquivo) return;
    setErro('');
    setLendo(true);
    try {
      const r = await extrairTexto(arquivo);
      if (!r.texto) throw new Error('Não encontramos texto neste arquivo.');
      setTexto(r.texto);
      setAvisos(r.avisos);
      setNomeArquivo(arquivo.name);
      if (!titulo) setTitulo(arquivo.name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').trim());
      if (r.planilha) setCategoria('planilha');
      else if (!editando) {
        if (/edital/i.test(arquivo.name)) setCategoria('edital');
        else if (/formul/i.test(arquivo.name)) setCategoria('formulario');
        else if (/\b(lei|decreto|resolu|portaria)/i.test(arquivo.name)) setCategoria('lei');
      }
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Não foi possível ler o arquivo.');
    } finally {
      setLendo(false);
    }
  }

  async function executar(acao: () => Promise<unknown>) {
    setSalvando(true);
    setErro('');
    try {
      await acao();
      aoFechar();
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Não foi possível salvar.');
      setSalvando(false);
    }
  }

  function salvar(e: FormEvent) {
    e.preventDefault();
    if (!texto.trim()) return setErro('O documento precisa de texto: envie um arquivo ou escreva/cole o conteúdo.');
    void executar(() => aoSalvar({ titulo, categoria, resumo, link: link.trim(), texto: texto.trim(), nome_arquivo: nomeArquivo }));
  }

  const rotulo = 'mb-1 block text-[13px] font-medium text-tinta-2';
  return (
    <Modal titulo={editando ? 'Editar documento' : 'Novo documento'} aoFechar={aoFechar} largo>
      <form onSubmit={salvar} className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label htmlFor="doc-titulo" className={rotulo}>Título <span aria-hidden className="text-perigo">*</span></label>
            <input id="doc-titulo" required maxLength={200} className="campo" value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Ex.: Edital de orçamento 2027: passo a passo" />
          </div>
          <div>
            <label htmlFor="doc-categoria" className={rotulo}>Tipo</label>
            <select id="doc-categoria" className="campo" value={categoria} onChange={(e) => setCategoria(e.target.value as Categoria)}>
              {Object.entries(DOC_CATEGORIA).map(([v, r]) => <option key={v} value={v}>{r}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="doc-link" className={rotulo}>Link do original (opcional)</label>
            <input id="doc-link" type="url" maxLength={1000} className="campo" value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://" />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="doc-resumo" className={rotulo}>Para que serve</label>
            <textarea id="doc-resumo" rows={2} maxLength={1000} className="campo" value={resumo} onChange={(e) => setResumo(e.target.value)} placeholder="Ex.: Como os projetos pedem verba para materiais no edital da prefeitura." />
          </div>
        </div>

        <label className="flex cursor-pointer items-center gap-3 rounded-lg border-2 border-dashed border-linha px-4 py-3 transition-colors hover:border-marca focus-within:border-marca">
          <FileUp size={22} className="shrink-0 text-tinta-3" aria-hidden />
          <span className="min-w-0">
            <span className="block text-sm font-medium">
              {lendo ? 'Lendo o arquivo...' : editando ? 'Substituir o texto pelo de um arquivo' : 'Enviar PDF, Word (.docx), Excel (.xlsx), CSV ou .txt'}
            </span>
            <span className="block text-xs text-tinta-2">
              {nomeArquivo ? `Arquivo: ${nomeArquivo}. ` : ''}O texto é lido aqui no navegador; o arquivo não é enviado.
            </span>
          </span>
          <input type="file" accept=".pdf,.docx,.xlsx,.csv,.txt,.md,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv,text/plain" className="sr-only" disabled={lendo || carregandoTexto} onChange={(e) => void escolher(e)} />
        </label>

        {avisos.map((a) => (
          <p key={a} role="status" className="rounded-md bg-alerta-suave px-3 py-2 text-[13px] text-alerta">{a}</p>
        ))}

        {categoria === 'planilha' && (
          <p className="rounded-md bg-info-suave px-3 py-2 text-[13px] text-info">
            Planilhas pequenas vão inteiras para o conselheiro analisar; as grandes, só nas linhas ligadas à pergunta. Soma, média, mínimo e máximo das colunas numéricas são calculados aqui, sem erro de conta.
            <strong className="mt-1 block font-semibold">
              Evite planilhas com dados de alunos (nomes, telefones, idades): telefones e e-mails são removidos, mas nomes que não estão cadastrados no QG podem chegar à IA.
            </strong>
          </p>
        )}

        <div>
          <div className="mb-1 flex items-baseline justify-between gap-2">
            <label htmlFor="doc-texto" className="text-[13px] font-medium text-tinta-2">Texto do documento <span aria-hidden className="text-perigo">*</span></label>
            {!carregandoTexto && <span className="text-xs text-tinta-3">{tamanho(texto.length)}</span>}
          </div>
          {carregandoTexto ? (
            <Carregando texto="Carregando o texto" />
          ) : (
            <textarea
              id="doc-texto"
              className="campo font-[inherit] leading-relaxed"
              rows={12}
              maxLength={MAX_TEXTO_DOCUMENTO}
              placeholder="Envie um arquivo acima ou cole/escreva aqui o conteúdo, por exemplo, de uma página do site do edital"
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
            />
          )}
        </div>

        {erro && <Erro mensagem={erro} />}
        <div className="flex flex-wrap items-center justify-end gap-2">
          {aoExcluir &&
            (confirmando ? (
              <>
                <span className="mr-auto text-sm text-tinta-2">Excluir este documento de vez?</span>
                <Botao variante="fantasma" onClick={() => setConfirmando(false)}>Manter</Botao>
                <Botao variante="perigo" carregando={salvando} onClick={() => void executar(aoExcluir)}>Sim, excluir</Botao>
              </>
            ) : (
              <Botao variante="perigo" className="mr-auto" onClick={() => setConfirmando(true)}>Excluir</Botao>
            ))}
          {!confirmando && (
            <>
              <Botao variante="fantasma" onClick={aoFechar}>Cancelar</Botao>
              <Botao variante="primario" type="submit" carregando={salvando} disabled={lendo || carregandoTexto}>
                {editando ? 'Salvar alterações' : 'Salvar documento'}
              </Botao>
            </>
          )}
        </div>
      </form>
    </Modal>
  );
}

/** Leitura do texto completo, buscado só quando alguém abre. */
function VerTexto({ doc, aoFechar, aoEditar }: { doc: Documento; aoFechar: () => void; aoEditar: () => void }) {
  const [texto, setTexto] = useState<string | null>(null);
  const [erro, setErro] = useState('');
  useEffect(() => {
    let ativo = true;
    api<Documento>(`/api/data/documentos/${encodeURIComponent(doc.id)}`).then(
      (d) => ativo && setTexto(d.texto ?? ''),
      (e: Error) => ativo && setErro(e.message),
    );
    return () => {
      ativo = false;
    };
  }, [doc.id]);
  return (
    <Modal titulo={doc.titulo} aoFechar={aoFechar} largo>
      {erro ? <Erro mensagem={erro} /> : texto === null ? <Carregando /> : <p className="text-sm whitespace-pre-wrap">{texto}</p>}
      <div className="mt-4 flex justify-end">
        <Botao onClick={aoEditar}><Pencil size={14} aria-hidden /> Editar</Botao>
      </div>
    </Modal>
  );
}

export default function PaginaDocumentos() {
  const { itens, carregando, erro, criar, atualizar, remover, recarregar } = useColecao('documentos');
  const [busca, setBusca] = useState('');
  const [categoria, setCategoria] = useState('');
  const [janela, setJanela] = useState<{ doc: Documento | null } | null>(null);
  const [vendo, setVendo] = useState<Documento | null>(null);

  const visiveis = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return itens
      .filter((d) => !categoria || d.categoria === categoria)
      .filter((d) => !q || `${d.titulo} ${d.resumo} ${d.nome_arquivo}`.toLowerCase().includes(q))
      .sort((a, b) => b.criado_em.localeCompare(a.criado_em));
  }, [itens, busca, categoria]);

  return (
    <>
      <CabecalhoPagina
        titulo="Documentos"
        descricao="Editais, passo a passos, formulários e leis. O conselheiro de IA consulta estes textos e cita o documento de onde tirou a resposta."
        acoes={<Botao variante="primario" onClick={() => setJanela({ doc: null })}><Plus size={16} aria-hidden /> Novo documento</Botao>}
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Busca valor={busca} aoMudar={setBusca} rotulo="Buscar por título ou resumo" />
        <Seletor rotulo="Filtrar por tipo" valor={categoria} aoMudar={setCategoria} opcoes={[{ valor: '', rotulo: 'Todos os tipos' }, ...Object.entries(DOC_CATEGORIA).map(([valor, rotulo]) => ({ valor, rotulo }))]} />
        <Link href="/ia" className="ml-auto inline-flex items-center gap-1.5 text-[13px] font-medium text-marca hover:underline">
          <Sparkles size={14} aria-hidden /> Perguntar ao conselheiro
        </Link>
      </div>

      {erro && <Erro mensagem={erro.message} aoTentar={() => void recarregar()} />}

      {carregando ? (
        <Carregando />
      ) : itens.length === 0 && !erro ? (
        <Vazio
          icone={FileText}
          titulo="Nenhum documento ainda"
          descricao="Envie o PDF ou Word de um edital ou de um passo a passo. Depois, pergunte ao conselheiro, por exemplo: como um projeto consegue verba pelo edital?"
          acao={<Botao variante="primario" onClick={() => setJanela({ doc: null })}>Enviar o primeiro documento</Botao>}
        />
      ) : visiveis.length === 0 ? (
        <Vazio icone={FileText} titulo="Nenhum documento com esse filtro" />
      ) : (
        <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {visiveis.map((d) => (
            <li key={d.id} className="flex flex-col rounded-lg border border-linha bg-painel p-4 shadow-painel">
              <div className="flex items-start gap-2">
                <FileText size={18} className="mt-0.5 shrink-0 text-tinta-3" aria-hidden />
                <button type="button" onClick={() => setVendo(d)} className="min-w-0 flex-1 text-left font-medium hover:underline">{d.titulo}</button>
                <Selo className="shrink-0">{DOC_CATEGORIA[d.categoria]}</Selo>
              </div>
              {d.resumo && <p className="mt-1.5 line-clamp-2 text-[13px] text-tinta-2">{d.resumo}</p>}
              <p className="mt-1.5 text-xs text-tinta-3">
                {tamanho(d.caracteres)}
                {d.nome_arquivo && ` · ${d.nome_arquivo}`} · enviado em {dataCurta(d.criado_em.slice(0, 10))}
              </p>
              <div className="mt-auto flex flex-wrap items-center gap-1.5 pt-3">
                <Botao pequeno onClick={() => setJanela({ doc: d })}><Pencil size={13} aria-hidden /> Editar</Botao>
                <Botao pequeno variante="fantasma" onClick={() => setVendo(d)}>Ver texto</Botao>
                {d.link && /^https?:\/\//i.test(d.link) && (
                  <a href={d.link} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-8 items-center gap-1 rounded-md px-2.5 text-[13px] font-medium text-tinta-2 hover:bg-painel-2 hover:text-tinta">
                    <ExternalLink size={13} aria-hidden /> Abrir original
                  </a>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {janela && (
        <JanelaDocumento
          key={janela.doc?.id ?? 'novo'}
          doc={janela.doc}
          aoFechar={() => setJanela(null)}
          aoSalvar={(v) => (janela.doc ? atualizar(janela.doc.id, v) : criar(v))}
          aoExcluir={janela.doc ? () => remover(janela.doc!.id) : undefined}
        />
      )}
      {vendo && (
        <VerTexto
          doc={vendo}
          aoFechar={() => setVendo(null)}
          aoEditar={() => {
            setJanela({ doc: vendo });
            setVendo(null);
          }}
        />
      )}
    </>
  );
}
