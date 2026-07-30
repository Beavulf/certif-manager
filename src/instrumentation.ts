export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { ensureBackgroundJobsStarted } = await import(
      '@/lib/start-background-jobs'
    );
    await ensureBackgroundJobsStarted();
  }
}
