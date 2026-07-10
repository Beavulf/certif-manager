export function buildCertificateDownloadPath(certificateId: string): string {
  return `/api/downloads/certificates/${certificateId}`;
}

export function buildDocumentDownloadPath(documentId: string): string {
  return `/api/downloads/documents/${documentId}`;
}
