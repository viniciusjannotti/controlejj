import { NextRequest, NextResponse } from 'next/server';
import { type ContatoImport, contatoId, importacaoSchema, preencherVazios, slug } from '@/lib/import';
import { parseCreate } from '@/lib/schema';
import { registrarAtividade } from '@/lib/server/atividade';
import { erroInterno, exigirMembro } from '@/lib/server/auth';
import { store } from '@/lib/server/store';

interface Item {
  id: string;
  dados: Record<string, unknown>;
}

/** Monta as escritas de contatos: novos entram completos; existentes só têm vazios preenchidos. */
async function escritasDeContatos(
  contatos: (ContatoImport & { categoria: string; origem: string })[],
  autor: string,
  agora: string,
): Promise<{ itens: Item[]; criados: number; atualizados: number }> {
  const existentes = new Map((await store().list('contatos')).map((c) => [c.id, c]));
  const unicos = new Map<string, (typeof contatos)[number]>();
  for (const c of contatos) unicos.set(contatoId(c.nome, c.telefone), c);

  const itens: Item[] = [];
  let criados = 0;
  let atualizados = 0;
  for (const [id, c] of unicos) {
    const atual = existentes.get(id);
    if (atual) {
      const dados = preencherVazios(atual as Record<string, unknown>, c as unknown as Record<string, unknown>);
      if (Object.keys(dados).length > 0) {
        itens.push({ id, dados: { ...dados, atualizado_em: agora } });
        atualizados++;
      }
    } else {
      const r = parseCreate('contatos', c);
      if (r.success) {
        itens.push({ id, dados: { ...r.data, criado_em: agora, atualizado_em: agora, criado_por: autor } });
        criados++;
      }
    }
  }
  return { itens, criados, atualizados };
}

export async function POST(req: NextRequest) {
  try {
    const { membro, erro } = await exigirMembro(req);
    if (erro) return erro;

    const r = importacaoSchema.safeParse(await req.json().catch(() => null));
    if (!r.success) return NextResponse.json({ erro: 'Arquivo em formato inesperado.' }, { status: 400 });

    const db = store();
    const agora = new Date().toISOString();
    const resultado = { criados: 0, atualizados: 0, contatos_criados: 0, nao_encontrados: [] as string[] };
    const imp = r.data;

    if (imp.tipo === 'projetos') {
      const existentes = new Set((await db.list('projetos')).map((p) => p.id));
      const itens: Item[] = [];
      for (const p of imp.registros) {
        const id = slug(p.nome);
        if (!id) continue;
        if (existentes.has(id)) {
          // Campos do QG (situação, observações, inscrições) ficam como estão.
          itens.push({ id, dados: { ...p, atualizado_em: agora } });
          resultado.atualizados++;
        } else {
          const novo = parseCreate('projetos', p);
          if (!novo.success) continue;
          itens.push({ id, dados: { ...novo.data, criado_em: agora, atualizado_em: agora, criado_por: membro.email } });
          existentes.add(id);
          resultado.criados++;
        }
      }
      await db.bulkMerge('projetos', itens);

      if (imp.criar_contatos) {
        // Uma pessoa pode cuidar de mais de um projeto: junta os nomes.
        const porPessoa = new Map<string, ContatoImport & { categoria: string; origem: string }>();
        for (const p of imp.registros) {
          if (!p.responsavel_nome) continue;
          const id = contatoId(p.responsavel_nome, p.telefone_responsavel);
          const atual = porPessoa.get(id);
          porPessoa.set(id, {
            nome: p.responsavel_nome,
            telefone: p.telefone_responsavel,
            email: '',
            funcao: 'Responsável por projeto',
            organizacao: atual ? `${atual.organizacao}, ${p.nome}`.slice(0, 200) : p.nome,
            observacoes: '',
            categoria: 'projeto_social',
            origem: 'joga-junto',
          });
        }
        const c = await escritasDeContatos([...porPessoa.values()], membro.email, agora);
        await db.bulkMerge('contatos', c.itens);
        resultado.contatos_criados = c.criados;
      }
    } else if (imp.tipo === 'contatos') {
      const c = await escritasDeContatos(
        imp.registros.map((x) => ({ ...x, categoria: 'outro', origem: 'importacao' })),
        membro.email,
        agora,
      );
      await db.bulkMerge('contatos', c.itens);
      resultado.criados = c.criados;
      resultado.atualizados = c.atualizados;
    } else {
      const existentes = new Set((await db.list('projetos')).map((p) => p.id));
      const itens: Item[] = [];
      for (const t of imp.registros) {
        const id = slug(t.projeto);
        if (!existentes.has(id)) {
          resultado.nao_encontrados.push(t.projeto);
          continue;
        }
        itens.push({
          id,
          dados: {
            inscricoes_total: t.total,
            inscricoes_novas: t.novas,
            inscricoes_contatadas: t.contatadas,
            inscricoes_matriculadas: t.matriculadas,
            atualizado_em: agora,
          },
        });
        resultado.atualizados++;
      }
      await db.bulkMerge('projetos', itens);
    }

    await registrarAtividade({
      acao: 'importou',
      colecao: imp.tipo,
      ref_id: '',
      titulo: `${imp.registros.length} registros de ${imp.tipo}`,
      ator: membro.nome,
    });
    return NextResponse.json(resultado);
  } catch (e) {
    return erroInterno(e);
  }
}
