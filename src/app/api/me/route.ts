import { NextRequest, NextResponse } from 'next/server';
import { erroInterno, exigirMembro } from '@/lib/server/auth';

export async function GET(req: NextRequest) {
  try {
    const { membro, erro } = await exigirMembro(req);
    return erro ?? NextResponse.json(membro);
  } catch (e) {
    return erroInterno(e);
  }
}
