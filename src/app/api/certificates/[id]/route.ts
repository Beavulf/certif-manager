// app/api/certificates/[id]/download/route.ts
import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getPresignedUrl } from '@/minio/minio'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const cert = await prisma.certificate.findUnique({
    where: { id },
  })

  if (!cert) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const url = await getPresignedUrl(cert.fileKey)

  // Редиректим на временную ссылку
  return NextResponse.redirect(url)
}