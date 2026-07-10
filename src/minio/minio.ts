import { Readable } from 'node:stream'

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
export async function getObjectStream(key: string): Promise<Readable> {
  return minioClient.getObject(BUCKET, key)
}

export async function getObjectBuffer(key: string): Promise<Buffer> {
  const stream = await getObjectStream(key)
  const chunks: Buffer[] = []

  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
  }

  return Buffer.concat(chunks)
}

export async function getObjectStat(key: string) {
  return minioClient.statObject(BUCKET, key)
}

export async function deleteFile(key: string): Promise<void> {
  await minioClient.removeObject(BUCKET, key)
}

export default minioClient