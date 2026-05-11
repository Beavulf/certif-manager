// app/api/certificates/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { uploadFile } from '@/minio/minio'
import { generateCertKey as genKey } from '@/minio/file-key'
import prisma from '@/lib/prisma'
import { parseCert } from '@/minio/parse-cert'

export async function POST(req: NextRequest) {
  const formData = await req.formData()
  const file = formData.get('file') as File
  const employeeId = String(formData.get('employeeId'))

  if (!file || !employeeId) {
    return NextResponse.json({ error: 'Не переданы file или employeeId' }, { status: 400 })
  }

  const buffer = Buffer.from(await file.arrayBuffer())
  const key = genKey(employeeId, file.name)

  // 1. Парсим сертификат
  const certData = parseCert(buffer, file.name)

  // 2. Заливаем в RustFS
  await uploadFile(key, buffer, file.type || 'application/octet-stream')

  // 3. Сохраняем в БД
  const cert = await prisma.certificate.create({
    data: {
      employeeId,
      serialNumber: certData.serialNumber,
      thumbprint: certData.thumbprint,
      subjectCN: certData.subjectCN,
      validFrom: certData.validFrom,
      validTo: certData.validTo,
      certType: certData.certType,
      fileKey: key,
      uploadedBy: 'admin', // потом заменим на JWT username
    },
  })

  return NextResponse.json(cert, { status: 201 })
}