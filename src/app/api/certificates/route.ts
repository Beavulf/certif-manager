import { NextResponse } from 'next/server';

export function POST() {
  return NextResponse.json(
    { error: 'Используйте server actions для загрузки сертификатов' },
    { status: 405 },
  );
}
