'use client';

import { ExternalLink, FileText, FileUp, Plus, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { type ChangeEvent, type FormEvent, useEffect, useMemo, useState } from 'react';
import { CAMPOS_DOCUMENTO } from '@/components/campos';
import { Formulario } from '@/components/Formulario';
import { Botao, Busca, CabecalhoPagina, Carregando, cx, Erro, Modal, Selo, Seletor, Vazio } from '@/components/ui';
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

/** Modal de envio: extrai o texto do arquivo (ou recebe colado) e salva. */
function NovoDocumento({ aoFechar, aoSalvar }: { aoFechar: () => void; aoSalvar: (v: Record<string, unknown>) => Promise<unknown> }) {
  const [modo, setModo] = useState<'arquivo' | 'colar'>('arquivo');
  const [nomeArquivo, setNomeArquivo] = useState('');
  const [texto, setTexto] = useState('');
  const [avisos, setAvisos] = useState<string[]>([]);
  const [lendo, setLendo] = useState(false);
  const [titulo, setTitulo] = useState('');
  const [categoria, setCategoria] = useState<Categoria>('passo_a_passo');
  const [resumo, setResumo] = useState('');
  const [link, setLink] = useState('');
  const [erro, setErro] = useState('');
  const [salvando, setSalvando] = useState(false);

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
      if (/edital/i.test(arquivo.name)) setCategoria('edital');
      else if (/formul/i.test(arquivo.name)) setCategoria('formulario');
      else if (/\b(lei|decreto|resolu|portaria)/i.test(arquivo.name)) setCategoria('lei');
    } catch (err) {
      setTexto('');
      setNomeArquivo('');
      setErro(err instanceof Error ? err.message : 'Não foi possível ler o arquivo.');
    } finally {
      setLendo(false);
    }
  }

  async function salvar(e: FormEvent) {
    e.preventDefault();
    if (!texto.trim()) return setErro(modo === 'arquivo' ? 'Escolha um arquivo primeiro.' : 'Cole o texto do documento.');
    setSalvando(true);
    setErro('');
    try {
      await aoSalvar({ titulo, categoria, resumo, link: link.trim(), texto: texto.trim(), nome_arquivo: modo === 'arquivo' ? nomeArquivo : '' });
      aoFechar();
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Não foi possível salvar.');
      setSalvando(false);
    }
  }

  const rotulo = 'mb-1 block text-[13px] font-medium text-tinta-2';
  return (
    <Modal titulo="Novo documento" aoFechar={aoFechar} largo>
      <form onSubmit={(e) => void salvar(e)} className="space-y-3">
        <div role="tablist" aria-label="Como adicionar" className="flex gap-1 rounded-md bg-painel-2 p-1">
          {(['arquivo', 'colar'] as const).map((m) => (
            <button
              key={m}
              type="button"
              role="tab"
              aria-selected={modo === m}
              onClick={() => { setModo(m); setTexto(''); setNomeArquivo(''); setAvisos([]); setErro(''); }}
              className={cx('flex-1 rounded px-3 py-1.5 text-sm font-medium', modo === m ? 'bg-painel text-tinta shadow-painel' : 'text-tinta-2 hover:text-tinta')}
            >
              {m === 'arquivo' ? 'Enviar arquivo' : 'Colar texto'}
            </button>
          ))}
        </div>

        {modo === 'arquivo' ? (
          <label className="flex cursor-pointer flex-col items-center gap-1.5 rounded-lg border-2 border-dashed border-linha p-6 text-center transition-colors hover:border-marca focus-within:border-marca">
            <FileUp size={24} className="text-tinta-3" aria-hidden />
            <span className="font-medium">{lendo ? 'Lendo o arquivo...' : nomeArquivo || 'Escolher PDF, Word (.docx) ou .txt'}</span>
            <span className="text-[13px] text-tinta-2">{texto ? `${tamanho(texto.length)}. Clique para trocar.` : 'O texto é lido aqui no navegador; o arquivo não é enviado.'}</span>
            <input type="file" accept=".pdf,.docx,.txt,.md,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain" className="sr-only" disabled={lendo} onChange={(e) => void escolher(e)} />
          </label>
        ) : (
          <div>
            <label htmlFor="doc-texto" className={rotulo}>Texto do documento <span aria-hidden className="text-perigo">*</span></label>
            <textarea id="doc-texto" className="campo" rows={8} maxLength={MAX_TEXTO_DOCUMENTO} placeholder="Cole aqui o conteúdo, por exemplo, de uma página do site do edital" value={texto} onChange={(e) => setTexto(e.target.value)} />
          </div>
        )}

        {avisos.map((a) => (
          <p key={a} role="status" className="rounded-md bg-alerta-suave px-3 py-2 text-[13px] text-alerta">{a}</p>
        ))}

        {modo === 'arquivo' && texto && (
          <details className="rounded-md border border-linha">
            <summary className="px-3 py-2 text-[13px] font-medium text-tinta-2">Conferir o texto extraído</summary>
            <p className="max-h-40 overflow-y-auto border-t border-linha px-3 py-2 text-[13px] whitespace-pre-wrap text-tinta-2">{texto.slice(0, 2000)}{texto.length > 2000 && '…'}</p>
          </details>
        )}

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

        {erro && <Erro mensagem={erro} />}
        <div className="flex justify-end gap-2">
          <Botao variante="fantasma" onClick={aoFechar}>Cancelar</Botao>
          <Botao variante="primario" type="submit" carregando={salvando} disabled={lendo}>Salvar documento</Botao>
        </div>
      </form>
    </Modal>
  );
}

/** Mostra o texto completo, buscado só quando alguém abre. */
function VerTexto({ doc, aoFechar }: { doc: Documento; aoFechar: () => void }) {
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
    </Modal>
  );
}

export default function PaginaDocumentos() {
  const { itens, carregando, erro, criar, atualizar, remover, recarregar } = useColecao('documentos');
  const [busca, setBusca] = useState('');
  const [categoria, setCategoria] = useState('');
  const [novo, setNovo] = useState(false);
  const [editando, setEditando] = useState<Documento | null>(null);
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
        acoes={<Botao variante="primario" onClick={() => setNovo(true)}><Plus size={16} aria-hidden /> Novo documento</Botao>}
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
          acao={<Botao variante="primario" onClick={() => setNovo(true)}>Enviar o primeiro documento</Botao>}
        />
      ) : visiveis.length === 0 ? (
        <Vazio icone={FileText} titulo="Nenhum documento com esse filtro" />
      ) : (
        <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {visiveis.map((d) => (
            <li key={d.id} className="flex flex-col rounded-lg border border-linha bg-painel p-4 shadow-painel">
              <div className="flex items-start gap-2">
                <FileText size={18} className="mt-0.5 shrink-0 text-tinta-3" aria-hidden />
                <button type="button" onClick={() => setEditando(d)} className="min-w-0 flex-1 text-left font-medium hover:underline">{d.titulo}</button>
                <Selo className="shrink-0">{DOC_CATEGORIA[d.categoria]}</Selo>
              </div>
              {d.resumo && <p className="mt-1.5 line-clamp-2 text-[13px] text-tinta-2">{d.resumo}</p>}
              <p className="mt-1.5 text-xs text-tinta-3">
                {tamanho(d.caracteres)}
                {d.nome_arquivo && ` · ${d.nome_arquivo}`} · enviado em {dataCurta(d.criado_em.slice(0, 10))}
              </p>
              <div className="mt-auto flex flex-wrap items-center gap-1.5 pt-3">
                <Botao pequeno onClick={() => setVendo(d)}>Ver texto</Botao>
                {d.link && /^https?:\/\//i.test(d.link) && (
                  <a href={d.link} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-8 items-center gap-1 rounded-md border border-linha px-2.5 text-[13px] font-medium hover:bg-painel-2">
                    <ExternalLink size={13} aria-hidden /> Abrir original
                  </a>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {novo && <NovoDocumento aoFechar={() => setNovo(false)} aoSalvar={criar} />}
      {vendo && <VerTexto doc={vendo} aoFechar={() => setVendo(null)} />}
      {editando && (
        <Formulario
          titulo="Editar documento"
          campos={CAMPOS_DOCUMENTO}
          inicial={editando}
          aoFechar={() => setEditando(null)}
          aoSalvar={(v) => atualizar(editando.id, v)}
          aoExcluir={() => remover(editando.id)}
        />
      )}
    </>
  );
}
