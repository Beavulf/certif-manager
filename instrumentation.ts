export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // Инициализация MinIO бакета
    const { initMinioBucket } = await import('@/minio/minio')
    await initMinioBucket()
    console.log('✅ MINIO bucket initialized');

    const { startCronJobs } = await import('./src/lib/cron');
    await startCronJobs();
    console.log('✅ Cron jobs started');

    const { verifySmtpConnection } = await import('./src/lib/mail');
    const resultSmtp = await verifySmtpConnection();
    if (!resultSmtp.success) {
      console.log('❌ SMTP connection failed:', resultSmtp.error);
    } else {
      console.log('✅ SMTP connection verified');
    }
    
  }
}