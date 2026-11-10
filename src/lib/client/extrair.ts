// Extrai o texto de PDF, Word (.docx) e arquivos de texto no próprio navegador.
// O arquivo não é enviado a lugar nenhum: só o texto extraído vai para o QG.

import { parseCsv } from '@/lib/import';
import { type Celula, planilhaParaTexto } from '@/lib/planilha';
import { MAX_TEXTO_DOCUMENTO } from '@/lib/schema';

export interface Extraido {
  texto: string;
  paginas?: number;
  avisos: string[];
  planilha: boolean;
}

/** CSV traz tudo como texto: números ("45", "1.234,50") viram número para entrar no resumo. */
function celulaCsv(v: string): Celula {
  const s = v.trim();
  if (/^-?\d+(,\d+)?$/.test(s)) return Number(s.replace(',', '.'));
  if (/^-?\d{1,3}(\.\d{3})+(,\d+)?$/.test(s)) return Number(s.replace(/\./g, '').replace(',', '.'));
  if (/^-?\d+\.\d+$/.test(s)) return Number(s);
  return s;
}

const MAX_ARQUIVO = 25 * 1024 * 1024;

function limpar(texto: string): string {
  return texto
    .replace(/\r\n?/g, '\n')
    .replace(/[ \t ]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export async function extrairTexto(arquivo: File): Promise<Extraido> {
  if (arquivo.size > MAX_ARQUIVO) throw new Error('Arquivo maior que 25 MB. Divida em partes ou cole só o trecho importante.');
  const nome = arquivo.name.toLowerCase();
  const avisos: string[] = [];
  let texto = '';
  let paginas: number | undefined;
  let planilha = false;

  if (nome.endsWith('.pdf')) {
    const { getDocumentProxy, extractText } = await import('unpdf');
    const pdf = await getDocumentProxy(new Uint8Array(await arquivo.arrayBuffer()));
    const r = await extractText(pdf, { mergePages: true });
    texto = r.text;
    paginas = r.totalPages;
    // PDF escaneado é só imagem: sem texto para ler.
    if (limpar(texto).length < 40 * Math.max(1, paginas)) {
      avisos.push('Este PDF parece ser uma imagem escaneada e quase não tem texto legível. Se possível, cole o texto na aba "Colar texto".');
    }
  } else if (nome.endsWith('.docx')) {
    const mammoth = (await import('mammoth')).default;
    texto = (await mammoth.extractRawText({ arrayBuffer: await arquivo.arrayBuffer() })).value;
  } else if (nome.endsWith('.xlsx')) {
    const { default: lerExcel } = await import('read-excel-file/browser');
    const abas = await lerExcel(arquivo);
    texto = planilhaParaTexto(abas.map((a) => ({ nome: a.sheet, linhas: a.data as unknown as Celula[][] })), arquivo.name);
    planilha = true;
  } else if (nome.endsWith('.csv')) {
    const linhas = parseCsv((await arquivo.text()).replace(/^﻿/, ''));
    const cabecalho = linhas.length ? Object.keys(linhas[0]) : [];
    texto = planilhaParaTexto([{ nome: 'CSV', linhas: [cabecalho, ...linhas.map((l) => cabecalho.map((c) => celulaCsv(l[c] ?? '')))] }], arquivo.name);
    planilha = true;
  } else if (/\.(txt|md)$/.test(nome)) {
    texto = await arquivo.text();
  } else if (nome.endsWith('.xls')) {
    throw new Error('Arquivo .xls antigo não é suportado. No Excel, use "Salvar como" e escolha .xlsx.');
  } else if (nome.endsWith('.doc')) {
    throw new Error('Arquivo .doc antigo não é suportado. No Word, use "Salvar como" .docx ou PDF.');
  } else {
    throw new Error('Formato não suportado. Envie PDF, Word (.docx), Excel (.xlsx), CSV ou texto (.txt).');
  }
  if (planilha && !texto) throw new Error('A planilha está vazia.');

  texto = limpar(texto);
  if (texto.length > MAX_TEXTO_DOCUMENTO) {
    texto = texto.slice(0, MAX_TEXTO_DOCUMENTO);
    avisos.push(`O texto passou de ${MAX_TEXTO_DOCUMENTO.toLocaleString('pt-BR')} caracteres e foi cortado. Para documentos muito longos, envie em partes.`);
  }
  return { texto, paginas, avisos, planilha };
}
