import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const token = req.cookies.get('fms_token')?.value;
  if (!token) {
    return NextResponse.json({ error: 'No token' }, { status: 401 });
  }
  return NextResponse.json({ token });
}
