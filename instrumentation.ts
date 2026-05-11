export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // Инициализация MinIO бакета
    const { initMinioBucket } = await import('@/minio/minio')
    console.log('MINIOINITIALIZATED');
    
    await initMinioBucket()

    // Cron (уже настроен)
    // const { startCronJobs } = await import('./lib/cron')
    // startCronJobs()
  }
}