import { randomUUID } from 'crypto'
import path from 'path'

export function generateCertKey(employeeId: string, originalName: string) {
  const ext = path.extname(originalName).toLowerCase()
  return `certs/${employeeId}/${randomUUID()}${ext}`
}

export function generateDocKey(certificateId: string, originalName: string) {
  const ext = path.extname(originalName).toLowerCase()
  return `docs/${certificateId}/${randomUUID()}${ext}`
}