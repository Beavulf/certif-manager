export const CERT_FILE_TYPES = {
  cer: '.cer',
  p7b: '.p7b',
}
export const DOC_FILE_TYPES = {
  doc: '.doc',
  docx: '.docx',
  pdf: '.pdf',
}
export const UPLOAD_FILE_CONFIG = {
  MAX_FILE_SIZE: 10 * 1024 * 1024,
  ARR_CERT_TYPE:Object.values(CERT_FILE_TYPES),
  ARR_DOC_TYPE:Object.values(DOC_FILE_TYPES),
}