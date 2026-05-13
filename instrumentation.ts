export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // Инициализация MinIO бакета
    const { initMinioBucket } = await import('@/minio/minio')
    console.log('✅ MINIO bucket initialized');

    await initMinioBucket()

    const { startCronJobs } = await import('./src/lib/cron');
    console.log('✅ Cron jobs started');
    await startCronJobs();
  }
}