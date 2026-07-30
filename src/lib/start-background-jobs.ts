type BootGlobal = typeof globalThis & {
  __certManagerBackgroundJobs?: Promise<void>;
};

/**
 * Idempotent bootstrap for MinIO + cron + SMTP check.
 * Uses globalThis so multiple Next bundles (layout / api / instrumentation)
 * share one startup — otherwise logs and cron tasks duplicate 2–3 times.
 */
export function ensureBackgroundJobsStarted(): Promise<void> {
  const g = globalThis as BootGlobal;

  if (!g.__certManagerBackgroundJobs) {
    g.__certManagerBackgroundJobs = startBackgroundJobs().catch((error) => {
      // Allow a later request/boot to retry if the first attempt failed.
      g.__certManagerBackgroundJobs = undefined;
      throw error;
    });
  }

  return g.__certManagerBackgroundJobs;
}

async function startBackgroundJobs(): Promise<void> {
  try {
    const { initMinioBucket } = await import('@/minio/minio');
    await initMinioBucket();
    console.log('✅ MINIO bucket initialized');
  } catch (error) {
    console.error(
      '❌ MINIO init failed (uploads/downloads unavailable until RustFS is up):',
      error,
    );
  }

  // Cron must start even if MinIO/SMTP are temporarily down.
  const { startCronJobs } = await import('@/lib/cron');
  await startCronJobs();
  console.log('✅ Cron jobs started');

  try {
    const { verifySmtpConnection } = await import('@/lib/mail');
    const resultSmtp = await verifySmtpConnection();
    if (!resultSmtp.success) {
      console.log('❌ SMTP connection failed:', resultSmtp.error);
    } else {
      console.log('✅ SMTP connection verified');
    }
  } catch (error) {
    console.error('❌ SMTP verify failed:', error);
  }
}
