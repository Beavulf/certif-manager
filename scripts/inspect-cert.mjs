import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import * as asn1js from "asn1js";
import {
  Certificate,
  ContentInfo,
  GeneralNames,
  SignedData,
} from "pkijs";

const OID = {
  cn: "2.5.4.3",
  o: "2.5.4.10",
  surname: "2.5.4.41",
  givenName: "2.5.4.42",
  initials: "2.5.4.43",
  emailAddress: "1.2.840.113549.1.9.1",
  subjectAltName: "2.5.29.17",
};

const ASN1_PARSE_LIMITS = {
  maxNodes: 2_000_000,
  maxContentLength: 64 * 1024 * 1024,
  maxDepth: 512,
};

function toArrayBuffer(buf) {
  return Uint8Array.from(buf).buffer;
}

function isPemLike(buffer) {
  return buffer.toString("utf8", 0, 40).includes("-----BEGIN");
}

function pemToDerArrayBuffer(pem) {
  const b64 = pem
    .replace(/-----BEGIN [^-]+-----/g, "")
    .replace(/-----END [^-]+-----/g, "")
    .replace(/\s+/g, "");
  return toArrayBuffer(Buffer.from(b64, "base64"));
}

function tryBase64ToDerArrayBuffer(buffer) {
  const text = buffer.toString("utf8").trim();
  if (!text) return null;
  if (!/^[A-Za-z0-9+/=\r\n\t ]+$/.test(text)) return null;

  const compact = text.replace(/\s+/g, "");
  const padLen = (4 - (compact.length % 4)) % 4;
  const padded = compact + "=".repeat(padLen);

  try {
    const decoded = Buffer.from(padded, "base64");
    if (decoded.length < 32) return null;
    return toArrayBuffer(decoded);
  } catch {
    return null;
  }
}

function parseDerCertificate(der) {
  const asn1 = asn1js.fromBER(der, ASN1_PARSE_LIMITS);
  if (asn1.offset === -1) throw new Error("ASN.1 fromBER error (certificate)");
  return new Certificate({ schema: asn1.result });
}

function asn1StringValue(v) {
  const val = v?.valueBlock?.value;
  return typeof val === "string" ? val : null;
}

function rdnStringValue(certName, oid) {
  const tv = certName?.typesAndValues?.find((x) => x.type === oid);
  if (!tv) return null;
  return asn1StringValue(tv.value);
}

function serialHex(cert) {
  return Buffer.from(cert.serialNumber.valueBlock.valueHex).toString("hex").toUpperCase();
}

function sha256Fingerprint(cert) {
  const der = Buffer.from(cert.toSchema().toBER(false));
  return crypto.createHash("sha256").update(der).digest("hex").toUpperCase();
}

function emailsFromSAN(cert) {
  const ext = cert.extensions?.find((e) => e.extnID === OID.subjectAltName);
  const parsed = ext?.parsedValue;
  const names = parsed instanceof GeneralNames ? parsed.names : [];

  return names
    .filter((n) => n.type === 1) // rfc822Name
    .map((n) => (typeof n.value === "string" ? n.value : String(n.value ?? "")))
    .filter(Boolean);
}

function certToInfo(cert) {
  const surname = rdnStringValue(cert.subject, OID.surname);
  const givenName = rdnStringValue(cert.subject, OID.givenName);
  const initials = rdnStringValue(cert.subject, OID.initials);
  const subjectFio =
    surname || givenName
      ? [surname, givenName, initials].filter(Boolean).join(" ").replace(/\s+/g, " ").trim()
      : null;

  const subjectCN = rdnStringValue(cert.subject, OID.cn) ?? "Unknown";
  const emailFromRdn = rdnStringValue(cert.subject, OID.emailAddress);
  const emailFromSan = emailsFromSAN(cert)[0] ?? null;
  const subjectEmail = emailFromRdn ?? emailFromSan;

  const issuerCN = rdnStringValue(cert.issuer, OID.cn) ?? "";
  const issuerO = rdnStringValue(cert.issuer, OID.o) ?? "";
  const issuer = [issuerCN, issuerO].filter(Boolean).join(", ");

  return {
    subjectFio,
    subjectCN,
    subjectEmail,
    issuer,
    serialNumber: serialHex(cert),
    thumbprintSha256: sha256Fingerprint(cert),
    validFrom: cert.notBefore.value.toISOString(),
    validTo: cert.notAfter.value.toISOString(),
  };
}

function parseCertificatesFromFile(buffer, ext) {
  if (ext === ".cer") {
    let der = isPemLike(buffer) ? pemToDerArrayBuffer(buffer.toString("utf8")) : toArrayBuffer(buffer);
    try {
      return [parseDerCertificate(der)];
    } catch {
      const b64Der = tryBase64ToDerArrayBuffer(buffer);
      if (!b64Der) throw new Error("Unable to parse .cer (expected DER/PEM/base64)");
      return [parseDerCertificate(b64Der)];
    }
  }

  if (ext === ".p7b" || ext === ".p7c") {
    let der = isPemLike(buffer) ? pemToDerArrayBuffer(buffer.toString("utf8")) : toArrayBuffer(buffer);
    let asn1 = asn1js.fromBER(der, ASN1_PARSE_LIMITS);
    if (asn1.offset === -1) {
      const b64Der = tryBase64ToDerArrayBuffer(buffer);
      if (!b64Der) throw new Error("Unable to parse .p7b (expected DER/PEM/base64)");
      der = b64Der;
      asn1 = asn1js.fromBER(der, ASN1_PARSE_LIMITS);
    }
    if (asn1.offset === -1) throw new Error("ASN.1 fromBER error (p7b)");

    const contentInfo = new ContentInfo({ schema: asn1.result });
    const signedData = new SignedData({ schema: contentInfo.content });
    const certs = (signedData.certificates ?? []).filter((c) => c instanceof Certificate);
    return certs;
  }

  throw new Error(`Unsupported extension: ${ext}`);
}

const args = process.argv.slice(2);
const filePath = args[0];
const indexFlag = args.findIndex((a) => a === "--index" || a === "-i");
const indexRaw = indexFlag >= 0 ? args[indexFlag + 1] : null;
const index = indexRaw ? Number(indexRaw) : null; // 1-based

if (!filePath) {
  console.error("Usage: node scripts/inspect-cert.mjs <path-to-.cer|.p7b> [--index N]");
  process.exit(2);
}

const abs = path.resolve(process.cwd(), filePath);
const ext = path.extname(abs).toLowerCase();
const buffer = fs.readFileSync(abs);

const certs = parseCertificatesFromFile(buffer, ext);
if (!certs.length) {
  console.error("No certificates found.");
  process.exit(1);
}

if (index !== null) {
  if (!Number.isInteger(index) || index < 1 || index > certs.length) {
    console.error(`Invalid --index. Expected 1..${certs.length}, got: ${indexRaw}`);
    process.exit(2);
  }

  const payload = {
    file: abs,
    type: ext.replace(".", ""),
    certificatesCount: certs.length,
    selectedIndex: index,
    certificate: certToInfo(certs[index - 1]),
  };

  console.log(JSON.stringify(payload, null, 2));
  process.exit(0);
}

const payload = {
  file: abs,
  type: ext.replace(".", ""),
  certificatesCount: certs.length,
  // для удобства показываем все, а не только первый
  certificates: certs.map((c) => certToInfo(c)),
};

console.log(JSON.stringify(payload, null, 2));

