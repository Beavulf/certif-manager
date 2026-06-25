export type EmployeeImportRow = {
  fullName: string;
  email: string;
  adUsername: string;
  department?: string;
  position?: string;
};

function normalizeHeader(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, '');
}

const HEADER_ALIASES: Record<string, keyof EmployeeImportRow> = {
  фио: 'fullName',
  fullname: 'fullName',
  имя: 'fullName',
  email: 'email',
  почта: 'email',
  adusername: 'adUsername',
  логин: 'adUsername',
  login: 'adUsername',
  username: 'adUsername',
  отдел: 'department',
  department: 'department',
  должность: 'position',
  position: 'position',
};

function splitCsvLine(line: string, delimiter: string): string[] {
  const cells: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (!inQuotes && char === delimiter) {
      cells.push(current.trim());
      current = '';
      continue;
    }
    current += char;
  }

  cells.push(current.trim());
  return cells;
}

export function parseEmployeesCsv(content: string): EmployeeImportRow[] {
  const normalized = content.replace(/^\uFEFF/, '').trim();
  if (!normalized) return [];

  const lines = normalized.split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return [];

  const delimiter = lines[0].includes(';') ? ';' : ',';
  const headers = splitCsvLine(lines[0], delimiter).map(normalizeHeader);
  const fieldIndexes = headers.map((header) => HEADER_ALIASES[header] ?? null);

  const rows: EmployeeImportRow[] = [];

  for (const line of lines.slice(1)) {
    const cells = splitCsvLine(line, delimiter);
    const row: Partial<EmployeeImportRow> = {};

    fieldIndexes.forEach((field, index) => {
      if (!field) return;
      const value = cells[index]?.trim();
      if (!value) return;
      row[field] = value;
    });

    if (row.fullName && row.email && row.adUsername) {
      rows.push({
        fullName: row.fullName,
        email: row.email,
        adUsername: row.adUsername,
        department: row.department,
        position: row.position,
      });
    }
  }

  return rows;
}
