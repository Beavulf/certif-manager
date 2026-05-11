import * as x509 from '@peculiar/x509'
import crypto from 'crypto'

export type ParsedCert = {
  subjectCN: string
  subjectEmail: string | null
  issuer: string
  serialNumber: string
  thumbprint: string
  validFrom: Date
  validTo: Date
  certType: 'cer' | 'p7b'
}

// ─── Главная функция ───────────────────────────────────────────
export function parseCert(buffer: Buffer, fileName: string): ParsedCert {
  const ext = fileName.split('.').pop()?.toLowerCase()
  return ext === 'p7b' ? parseP7b(buffer) : parseCer(buffer)
}

// ─── .cer — DER или PEM ────────────────────────────────────────
function parseCer(buffer: Buffer): ParsedCert {
  const cert = new x509.X509Certificate(buffer)
  return extractFields(cert, 'cer')
}

// ─── .p7b — PKCS#7 контейнер с цепочкой сертификатов ─────────
function parseP7b(buffer: Buffer): ParsedCert {
  // X509ChainBuilder или просто парсим как набор сертификатов
  const certs = new x509.X509Certificates(buffer)

  if (!certs.length) throw new Error('В .p7b не найдено сертификатов')

  // Первый сертификат — листовой (конечный)
  return extractFields(certs[0], 'p7b')
}

// ─── Извлечение полей ──────────────────────────────────────────
function extractFields(cert: x509.X509Certificate, certType: 'cer' | 'p7b'): ParsedCert {
  const subjectCN = cert.subjectName.getField('CN')[0] ?? 'Unknown'
  const subjectEmail = cert.subjectName.getField('E')[0] ?? null

  const issuerCN = cert.issuerName.getField('CN')[0] ?? ''
  const issuerO  = cert.issuerName.getField('O')[0]  ?? ''
  const issuer   = [issuerCN, issuerO].filter(Boolean).join(', ')

  // SHA-256 thumbprint
  const thumbprint = crypto
    .createHash('sha256')
    .update(Buffer.from(cert.rawData))
    .digest('hex')
    .toUpperCase()

  return {
    subjectCN,
    subjectEmail,
    issuer,
    serialNumber: cert.serialNumber.toUpperCase(),
    thumbprint,
    validFrom: cert.notBefore,
    validTo:   cert.notAfter,
    certType,
  }
}