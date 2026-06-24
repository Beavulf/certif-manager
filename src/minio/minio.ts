import * as Minio from 'minio'


const minioClient = new Minio.Client({
  endPoint: process.env.MINIO_ENDPOINT!,
  port: Number(process.env.MINIO_PORT),
  useSSL: process.env.MINIO_USE_SSL === 'true',
  accessKey: process.env.MINIO_ACCESS_KEY!,
  secretKey: process.env.MINIO_SECRET_KEY!,
})

export const BUCKET = process.env.MINIO_BUCKET!

// Вызывается один раз при старте (из instrumentation.ts)
export async function initMinioBucket() {
  const exists = await minioClient.bucketExists(BUCKET)
  if (!exists) {
    await minioClient.makeBucket(BUCKET)
    console.log(`[minio] Bucket "${BUCKET}" created ✓`)
  } else {
    console.log(`[minio] Bucket "${BUCKET}" already exists ✓`)
  }
}

// Загрузить файл → вернуть ключ в хранилище
export async function uploadFile(
  key: string,
  buffer: Buffer,
  mimeType: string
): Promise<string> {
  await minioClient.putObject(BUCKET, key, buffer, buffer.length, {
    'Content-Type': mimeType,
  })
  return key
}
export async function fileExists(key: string): Promise<boolean> {
  try {
    await minioClient.statObject(BUCKET, key)
    return true
  } catch (err) {
    if (
      err &&
      typeof err === 'object' &&
      'code' in err &&
      err.code === 'NotFound'
    ) {
      return false
    }
    throw err
  }
}
  // Получить временную ссылку на скачивание (10 минут)
  export async function getPresignedUrl(key: string): Promise<string> {
    return minioClient.presignedGetObject(BUCKET, key, 60 * 10)
  }
  
  // Удалить файл
  export async function deleteFile(key: string): Promise<void> {
    await minioClient.removeObject(BUCKET, key)
  }
  
export default minioClient