'use client';

import { CheckCircle2, FileUp, ShieldCheck } from 'lucide-react';
import { type ChangeEvent, useMemo, useState } from 'react';
import { Botao, CabecalhoPagina, Erro, Painel, Seletor } from '@/components/ui';
import { api } from '@/lib/client/api';
import { agregarInscricoes, detectarTipo, type Importacao, lerArquivo, type Linha, mapearContatos, mapearProjetos, type TipoImportacao } from '@/lib/import';

const ROTULOS: Record<TipoImportacao, string> = {
  projetos: 'Projetos do mapa',
  contatos: 'Lista de contatos',
  inscricoes: 'Inscrições (só totais por projeto)',
};

interface Resultado {
  criados: number;
  atualizados: number;
  contatos_criados: number;
  nao_encontrados: string[];
}

/** Planilhas salvas pelo Excel podem vir em Windows-1252 em vez de UTF-8. */
async function lerTexto(arquivo: File): Promise<string> {
  const bytes = await arquivo.arrayBuffer();
  const utf8 = new TextDecoder('utf-8').decode(bytes);
  return utf8.includes('�') ? new TextDecoder('windows-1252').decode(bytes) : utf8;
}

export default function PaginaImportar() {
  const [nome, setNome] = useState('');
  const [linhas, setLinhas] = useState<Linha[]>([]);
  const [tipo, setTipo] = useState<TipoImportacao | ''>('');
  const [criarContatos, setCriarContatos] = useState(true);
  const [erro, setErro] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [resultado, setResultado] = useState<Resultado | null>(null);

  async function escolher(e: ChangeEvent<HTMLInputElement>) {
    const arquivo = e.target.files?.[0];
    e.target.value = '';
    if (!arquivo) return;
    setErro('');
    setResultado(null);
    try {
      const lidas = lerArquivo(arquivo.name, await lerTexto(arquivo));
      if (lidas.length === 0) throw new Error('O arquivo não tem nenhuma linha de dados.');
      setNome(arquivo.name);
      setLinhas(lidas);
      setTipo(detectarTipo(lidas) ?? '');
    } catch (err) {
      setLinhas([]);
      setNome('');
      setErro(err instanceof SyntaxError ? 'Esse arquivo JSON está com erro de formato.' : err instanceof Error ? err.message : 'Não foi possível ler o arquivo.');
    }
  }

  // A prévia já mostra exatamente o que será enviado ao servidor.
  const importacao = useMemo<Importacao | null>(() => {
    if (tipo === 'projetos') return { tipo, registros: mapearProjetos(linhas), criar_contatos: criarContatos };
    if (tipo === 'contatos') return { tipo, registros: mapearContatos(linhas) };
    if (tipo === 'inscricoes') return { tipo, registros: agregarInscricoes(linhas) };
    return null;
  }, [tipo, linhas, criarContatos]);

  async function importar() {
    if (!importacao) return;
    setEnviando(true);
    setErro('');
    try {
      setResultado(await api<Resultado>('/api/import', { metodo: 'POST', corpo: importacao }));
      setLinhas([]);
      setNome('');
      setTipo('');
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível importar.');
    } finally {
      setEnviando(false);
    }
  }

  const colunasPrevia: { chave: string; rotulo: string }[] =
    tipo === 'projetos'
      ? [{ chave: 'nome', rotulo: 'Projeto' }, { chave: 'modalidade', rotulo: 'Modalidade' }, { chave: 'bairro', rotulo: 'Bairro' }, { chave: 'responsavel_nome', rotulo: 'Responsável' }]
      : tipo === 'contatos'
        ? [{ chave: 'nome', rotulo: 'Nome' }, { chave: 'telefone', rotulo: 'Telefone' }, { chave: 'funcao', rotulo: 'Função' }, { chave: 'organizacao', rotulo: 'Organização' }]
        : [{ chave: 'projeto', rotulo: 'Projeto' }, { chave: 'total', rotulo: 'Total' }, { chave: 'novas', rotulo: 'Novas' }, { chave: 'contatadas', rotulo: 'Contatadas' }, { chave: 'matriculadas', rotulo: 'Matriculadas' }];

  return (
    <div className="max-w-4xl">
      <CabecalhoPagina titulo="Importar" descricao="Traga os dados do Mapa Joga Junto. Importar de novo atualiza o que já existe, sem duplicar nem apagar o que a equipe escreveu aqui." />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Painel titulo="Como exportar do mapa">
          <ol className="list-decimal space-y-1.5 py-3 pr-4 pl-8 text-sm text-tinta-2">
            <li>Entre no painel do Mapa Joga Junto.</li>
            <li>Em <strong className="font-medium text-tinta">Projetos</strong> ou <strong className="font-medium text-tinta">Inscrições</strong>, clique em Exportar CSV.</li>
            <li>Envie o arquivo aqui. Importe os projetos antes das inscrições.</li>
          </ol>
        </Painel>
        <Painel titulo="Privacidade das inscrições">
          <p className="flex gap-2.5 p-4 text-sm text-tinta-2">
            <ShieldCheck size={18} className="mt-0.5 shrink-0 text-marca" aria-hidden />
            <span>O CSV de inscrições tem dados de crianças e adolescentes. Ele é processado no seu navegador e só os totais por projeto são enviados. Nomes e telefones não chegam ao QG.</span>
          </p>
        </Painel>
      </div>

      <label className="mt-4 flex cursor-pointer flex-col items-center gap-2 rounded-lg border-2 border-dashed border-linha bg-painel p-8 text-center transition-colors hover:border-marca focus-within:border-marca">
        <FileUp size={26} className="text-tinta-3" aria-hidden />
        <span className="font-medium">{nome || 'Escolher arquivo CSV ou JSON'}</span>
        <span className="text-[13px] text-tinta-2">{nome ? `${linhas.length} linhas lidas. Clique para trocar.` : 'O arquivo ainda não será salvo: você confere antes.'}</span>
        <input type="file" accept=".csv,.json,text/csv,application/json" className="sr-only" onChange={(e) => void escolher(e)} />
      </label>

      {erro && <div className="mt-4"><Erro mensagem={erro} /></div>}

      {resultado && (
        <div role="status" className="mt-4 flex gap-2.5 rounded-lg border border-marca bg-marca-suave p-4 text-sm">
          <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-marca" aria-hidden />
          <div>
            <p className="font-medium">Importação concluída</p>
            <p className="text-tinta-2">
              {resultado.criados} novos, {resultado.atualizados} atualizados
              {resultado.contatos_criados > 0 && `, ${resultado.contatos_criados} contatos criados`}.
            </p>
            {resultado.nao_encontrados.length > 0 && (
              <p className="mt-1 text-tinta-2">Sem projeto correspondente, importe os projetos antes: {resultado.nao_encontrados.join(', ')}.</p>
            )}
          </div>
        </div>
      )}

      {linhas.length > 0 && (
        <Painel titulo="Conferir antes de importar" className="mt-4">
          <div className="flex flex-wrap items-center gap-3 border-b border-linha px-4 py-3">
            <Seletor
              rotulo="Tipo do arquivo"
              valor={tipo}
              aoMudar={(v) => setTipo(v as TipoImportacao | '')}
              opcoes={[{ valor: '', rotulo: 'Selecione o tipo do arquivo' }, ...(Object.keys(ROTULOS) as TipoImportacao[]).map((v) => ({ valor: v, rotulo: ROTULOS[v] }))]}
            />
            {tipo === 'projetos' && (
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" className="size-4 accent-[var(--marca)]" checked={criarContatos} onChange={(e) => setCriarContatos(e.target.checked)} />
                Criar contatos dos responsáveis
              </label>
            )}
          </div>

          {!tipo ? (
            <p className="p-4 text-sm text-tinta-2">Não reconhecemos as colunas automaticamente. Escolha o tipo acima.</p>
          ) : importacao && importacao.registros.length === 0 ? (
            <p className="p-4 text-sm text-tinta-2">Nenhum registro aproveitável com esse tipo: confira se o arquivo tem a coluna Nome (ou Projeto, nas inscrições).</p>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-[13px]">
                  <thead className="border-b border-linha text-tinta-2">
                    <tr>{colunasPrevia.map((c) => <th key={c.chave} className="px-4 py-2 font-medium whitespace-nowrap">{c.rotulo}</th>)}</tr>
                  </thead>
                  <tbody className="divide-y divide-linha">
                    {(importacao?.registros ?? []).slice(0, 8).map((r, i) => (
                      <tr key={i}>{colunasPrevia.map((c) => <td key={c.chave} className="px-4 py-2">{String((r as unknown as Record<string, unknown>)[c.chave] ?? '')}</td>)}</tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-linha px-4 py-3">
                <p className="text-[13px] text-tinta-2">{importacao?.registros.length} registros serão importados{(importacao?.registros.length ?? 0) > 8 && '; mostrando os 8 primeiros'}.</p>
                <Botao variante="primario" carregando={enviando} onClick={() => void importar()}>Importar agora</Botao>
              </div>
            </>
          )}
        </Painel>
      )}
    </div>
  );
}
