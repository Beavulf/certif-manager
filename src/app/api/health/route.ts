import { NextResponse } from 'next/server';
import { ensureBackgroundJobsStarted } from '@/lib/start-background-jobs';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Lightweight boot/health endpoint.
 * Used by standalone-start.cjs to start cron when Next skips instrumentation.
 */
export async function GET() {
  try {
    await ensureBackgroundJobsStarted();
    return NextResponse.json({ ok: true, backgroundJobs: true });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        backgroundJobs: false,
        error: error instanceof Error ? error.message : 'boot failed',
      },
      { status: 503 },
    );
  }
}
