import "reflect-metadata"
import { X509Certificate } from 'crypto'
import crypto from 'crypto'
import fs from 'fs'
import path from 'path'

type ParsedCert = {
  subjectCN: string
  subjectEmail: string | null
  issuer: string
  serialNumber: string
  thumbprint: string
  validFrom: Date
  validTo: Date
  certType: 'cer' | 'p7b'
  subjectKeyId: string | null
}

// ─── TLV парсер — читает заголовок одного ASN.1 блока ─────────
function readTLV(buf: Buffer, offset: number): { headerLen: number; contentLen: number } {
  let pos = offset + 1 // пропускаем тег
  const first = buf[pos]
  if (first < 0x80) {
    return { headerLen: 2, contentLen: first }
  }
  const n = first & 0x7f
  let len = 0
  for (let i = 0; i < n; i++) len = (len << 8) | buf[pos + 1 + i]
  return { headerLen: 2 + n, contentLen: len }
}

// ─── Извлечь DER байты сертификатов из .p7b без forge ─────────
function extractCertsFromP7b(buffer: Buffer): Buffer[] {
  // PEM → DER
  let buf: Buffer
  if (buffer.toString('utf8', 0, 30).includes('-----BEGIN')) {
    const b64 = buffer.toString('utf8').replace(/-----[^-]+-----/g, '').replace(/\s+/g, '')
    buf = Buffer.from(b64, 'base64')
    console.log('  🔍 Формат: PEM')
  } else {
    buf = buffer
    console.log('  🔍 Формат: DER')
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

  console.log(`  📦 Сертификатов в контейнере: ${certs.length}`)
  return certs
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

// получение значений полей
function extractFields(cert: X509Certificate, certType: 'cer' | 'p7b'): ParsedCert {
  const parseField = (raw: string, field: string): string | null => {
    const line = raw.split('\n').find(l => l.trimStart().startsWith(`${field}=`))
    if (!line) return null
    return line.slice(line.indexOf('=') + 1).trim()
  }
  const keyIden = getSubjectKeyIdentifier(cert.raw)

  const sn = parseField(cert.subject, 'SN')
  const name = parseField(cert.subject, 'name')
  const cn = parseField(cert.subject, 'CN') 

  const fullName = [sn, name].filter(Boolean).join(' ') || cn || 'Unknown'
  
  return {
    subjectCN: fullName,
    subjectKeyId: keyIden ?? 'null',
    subjectEmail: parseField(cert.subject, 'emailAddress'),
    issuer: parseField(cert.issuer, 'CN') ?? parseField(cert.issuer, 'O') ?? '',
    serialNumber: cert.serialNumber.toUpperCase(),
    thumbprint: crypto.createHash('sha256').update(cert.raw).digest('hex').toUpperCase(),
    validFrom: new Date(cert.validFrom),
    validTo: new Date(cert.validTo),
    certType,
  }
}

function parseCertFromPath(filePath: string): ParsedCert {
  const absPath = path.resolve(filePath)
  if (!fs.existsSync(absPath)) throw new Error(`Файл не найден: ${absPath}`)

  const buffer = fs.readFileSync(absPath)
  const ext = path.extname(filePath).toLowerCase().replace('.', '')

  console.log(`  📄 Файл  : ${absPath}`)
  console.log(`  📦 Размер: ${(buffer.length / 1024 / 1024).toFixed(2)} МБ`)

  if (ext === 'p7b') {
    const certs = extractCertsFromP7b(buffer)
    return extractFields(new X509Certificate(certs[0]), 'p7b')
  }

  return extractFields(new X509Certificate(buffer), 'cer')
}

// ─── Запуск ───────────────────────────────────────────────────
const filePath = process.argv[2]

if (!filePath) {
  console.error('\nУкажи путь к файлу:')
  console.error('  npx tsx lib/parse-cert.test.ts ./test.cer')
  console.error('  npx tsx lib/parse-cert.test.ts ./test.p7b\n')
  process.exit(1)
}

try {
    
  console.log('\n🔍 Парсинг...\n')
  const result = parseCertFromPath(filePath)

  console.log('\n✅ Успешно:\n')
  console.log(`  Тип файла   : ${result.certType.toUpperCase()}`)
  console.log(`  CN субъекта : ${result.subjectCN}`)
  console.log(`  Идентификатор : ${result.subjectKeyId}`)
  console.log(`  Email       : ${result.subjectEmail ?? '—'}`)
  console.log(`  Издатель    : ${result.issuer}`)
  console.log(`  Серийный №  : ${result.serialNumber}`)
  console.log(`  Отпечаток   : ${result.thumbprint}`)
  console.log(`  Действует с : ${result.validFrom.toLocaleDateString('ru-RU')}`)
  console.log(`  Действует по: ${result.validTo.toLocaleDateString('ru-RU')}`)

  const daysLeft = Math.ceil((result.validTo.getTime() - Date.now()) / 86_400_000)
  if (daysLeft < 0)        console.log(`\n  ⛔ Просрочен на ${Math.abs(daysLeft)} дней`)
  else if (daysLeft <= 30) console.log(`\n  ⚠️  Истекает через ${daysLeft} дней`)
  else                     console.log(`\n  ✅ До истечения: ${daysLeft} дней`)

  console.log()
} catch (err) {
  console.error(`\n❌ Ошибка: ${err}\n`)
  process.exit(1)
}