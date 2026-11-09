import { NextRequest, NextResponse } from 'next/server';
import { erroInterno, exigirMembro } from '@/lib/server/auth';
import { store } from '@/lib/server/store';

export async function GET(req: NextRequest) {
  try {
    const { erro } = await exigirMembro(req);
    if (erro) return erro;
    return NextResponse.json(await store().recentes('atividade', 'em', 30));
  } catch (e) {
    return erroInterno(e);
  }
}
