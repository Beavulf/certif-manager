// lib/parse-cert.ts
import { ConflictError, NotFoundError } from '@/server/errors/app-error'
import { X509Certificate } from 'crypto'
import crypto from 'crypto'
import path from 'path'

export type ParsedCert = {
  subjectCN: string
  department: string | null
  serialNumber: string
  thumbprint: string
  validFrom: Date
  validTo: Date
  certType: 'cer' | 'p7b'
  subjectKeyId: string | null
}

/** Форматирует hex-строку SKI для отображения: пары байт через пробел. */
export function formatSubjectKeyId(value: string): string {
  const normalized = value.replace(/\s+/g, '').toUpperCase()
  return normalized.replace(/(.{2})(?=.)/g, '$1 ').trim()
}

// ─── TLV парсер ───────────────────────────────────────────────
function readTLV(buf: Buffer, offset: number): { headerLen: number; contentLen: number } {
  let pos = offset + 1
  const first = buf[pos]
  if (first < 0x80) return { headerLen: 2, contentLen: first }
  const n = first & 0x7f
  let len = 0
  for (let i = 0; i < n; i++) len = (len << 8) | buf[pos + 1 + i]
  return { headerLen: 2 + n, contentLen: len }
}

// ─── Извлечение поля из subject/issuer строки ─────────────────
function parseField(raw: string, field: string): string | null {
  const line = raw.split('\n').find(l => l.trimStart().startsWith(`${field}=`))
  if (!line) return null
  return line.slice(line.indexOf('=') + 1).trim()
}

// получение идентификатора ключа субъекта
function getSubjectKeyIdentifier(certRaw: Buffer): string | null {
    const oidBytes = Buffer.from([0x55, 0x1d, 0x0e])
    const idx = certRaw.indexOf(oidBytes)
    if (idx === -1) return null
  
    let pos = idx + oidBytes.length
  
    if (certRaw[pos] === 0x01) {
      const boolTLV = readTLV(certRaw, pos)
      pos += boolTLV.headerLen + boolTLV.contentLen
    }
  
    if (certRaw[pos] !== 0x04) return null
    const outer = readTLV(certRaw, pos); pos += outer.headerLen
  
    if (certRaw[pos] !== 0x04) return null
    const inner = readTLV(certRaw, pos); pos += inner.headerLen
  
    const skiBytes = certRaw.slice(pos, pos + inner.contentLen)
    return skiBytes.toString('hex').toUpperCase()
  }

// ─── Извлечение полей из crypto.X509Certificate ───────────────
function extractFields(cert: X509Certificate, certType: 'cer' | 'p7b'): ParsedCert {

  const sn = parseField(cert.subject, 'SN')
  const name = parseField(cert.subject, 'name')
  const cn = parseField(cert.subject, 'CN')
  const fullName = [sn, name].filter(Boolean).join(' ') || cn || 'Unknown'
  const identKey = getSubjectKeyIdentifier(cert.raw)

  return {
    subjectCN: fullName,
    subjectKeyId: identKey ?? null,
    department: parseField(cert.subject, 'O'),
    serialNumber: cert.serialNumber.toUpperCase(),
    thumbprint: crypto.createHash('sha256').update(cert.raw).digest('hex').toUpperCase(),
    validFrom: new Date(cert.validFrom),
    validTo: new Date(cert.validTo),
    certType,
  }
}

// ─── Распаковка .p7b контейнера — ручной TLV ─────────────────
function extractCertsFromP7b(buffer: Buffer): Buffer[] {
  // PEM → DER если нужно
  let buf: Buffer
  if (buffer.toString('utf8', 0, 30).includes('-----BEGIN')) {
    const b64 = buffer.toString('utf8').replace(/-----[^-]+-----/g, '').replace(/\s+/g, '')
    buf = Buffer.from(b64, 'base64')
  } else {
    buf = buffer
  }

  let pos = 0

  // ContentInfo SEQUENCE
  const ci = readTLV(buf, pos); pos += ci.headerLen
  // OID — пропускаем
  const oid = readTLV(buf, pos); pos += oid.headerLen + oid.contentLen
  // [0] EXPLICIT (0xa0)
  const exp = readTLV(buf, pos); pos += exp.headerLen
  // SignedData SEQUENCE
  const sd = readTLV(buf, pos); pos += sd.headerLen

  // Пропускаем поля SignedData до certificates [0] (тег 0xa0)
  while (pos < buf.length && buf[pos] !== 0xa0) {
    const field = readTLV(buf, pos)
    pos += field.headerLen + field.contentLen
  }

  if (buf[pos] !== 0xa0) throw new Error('Поле certificates не найдено в .p7b')

  const certsField = readTLV(buf, pos); pos += certsField.headerLen
  const certsEnd = pos + certsField.contentLen

  const certs: Buffer[] = []
  while (pos < certsEnd && buf[pos] === 0x30) {
    const cert = readTLV(buf, pos)
    const totalLen = cert.headerLen + cert.contentLen
    certs.push(buf.slice(pos, pos + totalLen))
    pos += totalLen
  }

  if (!certs.length) throw new NotFoundError('В .p7b не найдено сертификатов')
  return certs
}

// ─── Главная функция — используется в API Route ───────────────
export function parseCert(buffer: Buffer, fileName: string): ParsedCert {
  const ext = path.extname(fileName).toLowerCase().replace('.', '')

  if (ext === 'p7b') {
    const certs = extractCertsFromP7b(buffer)
    return extractFields(new X509Certificate(certs[0]), 'p7b')
  }

  if (ext === 'cer') {
    return extractFields(new X509Certificate(buffer), 'cer')
  }

  throw new ConflictError(`Неподдерживаемый формат файла: .${ext}. Поддерживаются: .cer, .p7b`)
}