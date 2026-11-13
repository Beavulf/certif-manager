import { NextResponse } from 'next/server';
import { checkExpiringCertificates } from '@/lib/notifications';
import { ensureBackgroundJobsStarted } from '@/lib/start-background-jobs';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * External daily trigger for Windows Task Scheduler / PM2 cron.
 * More reliable than in-process node-cron when the console freezes (Quick Edit).
 *
 * Auth: Authorization: Bearer <CRON_SECRET>  or  ?secret=<CRON_SECRET>
 * Set CRON_SECRET in .env on the server.
 */
function isAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false;

  const header = request.headers.get('authorization');
  if (header?.startsWith('Bearer ') && header.slice(7) === secret) {
    return true;
  }

  const url = new URL(request.url);
  return url.searchParams.get('secret') === secret;
}

export async function POST(request: Request) {
  if (!process.env.CRON_SECRET?.trim()) {
    return NextResponse.json(
      { ok: false, error: 'CRON_SECRET is not configured' },
      { status: 503 },
    );
  }

  if (!isAuthorized(request)) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await ensureBackgroundJobsStarted();
    const result = await checkExpiringCertificates({ initiatedBy: 'cron' });
    return NextResponse.json({ ok: true, result });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : 'cron failed',
      },
      { status: 500 },
    );
  }
}

export async function GET(request: Request) {
  return POST(request);
}
