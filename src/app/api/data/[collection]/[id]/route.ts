import { NextRequest, NextResponse } from 'next/server';
import { isColecao, paraLista, parsePatch, tituloDe } from '@/lib/schema';
import { registrarAtividade } from '@/lib/server/atividade';
import { erroInterno, exigirMembro } from '@/lib/server/auth';
import { store } from '@/lib/server/store';

const naoEncontrado = () => NextResponse.json({ erro: 'Registro não encontrado.' }, { status: 404 });

/** Registro completo, inclusive o texto de um documento. */
export async function GET(req: NextRequest, ctx: RouteContext<'/api/data/[collection]/[id]'>) {
  try {
    const { erro } = await exigirMembro(req);
    if (erro) return erro;
    const { collection, id } = await ctx.params;
    if (!isColecao(collection)) return naoEncontrado();
    const doc = await store().get(collection, id);
    return doc ? NextResponse.json(doc) : naoEncontrado();
  } catch (e) {
    return erroInterno(e);
  }
}

export async function PATCH(req: NextRequest, ctx: RouteContext<'/api/data/[collection]/[id]'>) {
  try {
    const { membro, erro } = await exigirMembro(req);
    if (erro) return erro;
    const { collection, id } = await ctx.params;
    if (!isColecao(collection)) return naoEncontrado();

    const r = parsePatch(collection, await req.json().catch(() => null));
    if (!r.success) return NextResponse.json({ erro: r.error.issues[0]?.message ?? 'Dados inválidos.' }, { status: 400 });

    const doc = await store().update(collection, id, { ...r.data, atualizado_em: new Date().toISOString() });
    if (!doc) return naoEncontrado();
    await registrarAtividade({ acao: 'editou', colecao: collection, ref_id: id, titulo: tituloDe(doc), ator: membro.nome });
    return NextResponse.json(paraLista(collection, doc));
  } catch (e) {
    return erroInterno(e);
  }
}

export async function DELETE(req: NextRequest, ctx: RouteContext<'/api/data/[collection]/[id]'>) {
  try {
    const { membro, erro } = await exigirMembro(req);
    if (erro) return erro;
    const { collection, id } = await ctx.params;
    if (!isColecao(collection)) return naoEncontrado();

    const atual = await store().get(collection, id);
    if (!atual || !(await store().remove(collection, id))) return naoEncontrado();
    await registrarAtividade({ acao: 'removeu', colecao: collection, ref_id: id, titulo: tituloDe(atual), ator: membro.nome });
    return new NextResponse(null, { status: 204 });
  } catch (e) {
    return erroInterno(e);
  }
}
