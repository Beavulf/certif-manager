// Демо-данные для локального превью UI. Запуск:
//   DB_URL=<локальная база> MINIO_PORT=9100 npx tsx scripts/local-preview/seed.ts
// Создаёт сотрудников и сертификаты с датами под все статусы
// (активные / warning / critical / истёкшие / отозванные),
// файлы сертификатов кладёт в MinIO, чтобы скачивание работало.
import { PrismaClient } from '../../src/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import * as Minio from 'minio';

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DB_URL }),
});

const minio = new Minio.Client({
  endPoint: process.env.MINIO_ENDPOINT!,
  port: Number(process.env.MINIO_PORT),
  useSSL: process.env.MINIO_USE_SSL === 'true',
  accessKey: process.env.MINIO_ACCESS_KEY!,
  secretKey: process.env.MINIO_SECRET_KEY!,
});
const BUCKET = process.env.MINIO_BUCKET!;

const DAY = 24 * 60 * 60 * 1000;
const now = Date.now();

const PEOPLE: Array<[string, string, string]> = [
  ['Иванов Иван Иванович', 'ИТ', 'Ведущий системный администратор'],
  ['Петрова Мария Сергеевна', 'Бухгалтерия', 'Главный бухгалтер'],
  ['Сидоров Алексей Петрович', 'ИТ', 'Инженер-программист'],
  ['Ковалёва Анна Викторовна', 'Отдел кадров', 'Специалист по кадрам'],
  ['Новик Дмитрий Александрович', 'Юридический отдел', 'Юрисконсульт'],
  ['Морозова Елена Николаевна', 'Экономический отдел', 'Ведущий экономист'],
  ['Волков Сергей Олегович', 'Логистика', 'Начальник отдела логистики'],
  ['Лысенко Татьяна Ивановна', 'Бухгалтерия', 'Бухгалтер по расчётам'],
  ['Гущин Павел Витальевич', 'Склад', 'Заведующий складом'],
  ['Романова Ольга Дмитриевна', 'Отдел кадров', 'Начальник отдела кадров'],
  ['Кравченко Максим Игоревич', 'ИТ', 'Системный аналитик'],
  ['Степанова Вера Павловна', 'Экономический отдел', 'Экономист'],
  ['Ткачёв Андрей Николаевич', 'Логистика', 'Водитель-международник'],
  ['Киселёва Наталья Сергеевна', 'Юридический отдел', 'Главный юрисконсульт'],
  ['Панкратов Виктор Сергеевич', 'Склад', 'Приёмосдатчик'],
  ['Жук Алина Романовна', 'ИТ', 'Специалист по информационной безопасности'],
];

function translit(name: string): string {
  const map: Record<string, string> = {
    а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'e', ж: 'zh', з: 'z',
    и: 'i', й: 'i', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r',
    с: 's', т: 't', у: 'u', ф: 'f', х: 'h', ц: 'c', ч: 'ch', ш: 'sh', щ: 'sch',
    ъ: '', ы: 'y', ь: '', э: 'e', ю: 'yu', я: 'ya',
  };
  const parts = name.toLowerCase().split(' ');
  const translitPart = (part: string) =>
    part.split('').map((ch) => map[ch] ?? ch).join('');
  const surname = translitPart(parts[0]);
  const initial = parts[1]?.[0] ? translitPart(parts[1][0]) : '';
  return `${surname}${initial}`;
}

function hex(len: number, seed: number): string {
  let out = '';
  let x = seed * 2654435761 % 4294967296;
  while (out.length < len) {
    x = (x * 1103515245 + 12345) % 4294967296;
    out += x.toString(16).padStart(8, '0');
  }
  return out.slice(0, len).toUpperCase();
}

type CertSpec = { offsetDays: number };

// offsets в днях до истечения: положительные — действует, отрицательные — истёк.
const PLAN: CertSpec[][] = [
  [{ offsetDays: 210 }, { offsetDays: 400 }],
  [{ offsetDays: 18 }, { offsetDays: 640 }],
  [{ offsetDays: 120 }],
  [{ offsetDays: 25 }],
  [{ offsetDays: -14 }, { offsetDays: 95 }],
  [{ offsetDays: 5 }],
  [{ offsetDays: 300 }, { offsetDays: 75 }],
  [{ offsetDays: 150 }],
  [{ offsetDays: -40 }, { offsetDays: 28 }],
  [{ offsetDays: 55 }, { offsetDays: 9 }, { offsetDays: 480 }],
  [{ offsetDays: 260 }],
  [{ offsetDays: 33 }],
  [{ offsetDays: 12 }, { offsetDays: -25 }],
  [{ offsetDays: 460 }],
  [{ offsetDays: 21 }],
  [{ offsetDays: 700 }, { offsetDays: -8 }],
];

const REVOKED_SERIALS = new Set<number>();
REVOKED_SERIALS.add(3);
REVOKED_SERIALS.add(20);

const NOTES: Record<number, string> = {
  1: 'Перевыпущен досрочно после смены фамилии',
  6: 'Проверить КП ЭП перед продлением',
  11: 'Скан заявления в делах отдела кадров',
};

async function main() {
  // Защита: сидирование только в локальную превью-базу (порт 54320),
  // чтобы случайно не затереть данные на сервере.
  const dbPort = new URL(process.env.DB_URL!).port;
  if (dbPort !== '54320') {
    console.error(`[seed] Отказ: DB_URL указывает на порт ${dbPort} — сидирую только localhost:54320.`);
    return;
  }

  const exists = await minio.bucketExists(BUCKET);
  if (!exists) {
    await minio.makeBucket(BUCKET);
    console.log(`[seed] Бакет «${BUCKET}» создан.`);
  }

  const existing = await prisma.employee.count();
  if (existing > 0) {
    if (process.env.FORCE_RESEED !== '1') {
      const certs = await prisma.certificate.count();
      // Полный сид даёт ~2 сертификата на сотрудника; меньше — частичный сид.
      if (certs > existing) {
        console.log(`[seed] База уже заполнена (${existing} сотрудников, ${certs} сертификатов) — пропускаю.`);
        return;
      }
      console.log('[seed] Обнаружен частичный сид.');
    }
    // certificates → documents/notifications каскадом; сотрудник отвязывает сертификаты (SetNull),
    // поэтому сертификаты удаляем явно, иначе останутся сироты с занятыми серийниками.
    await prisma.certificate.deleteMany();
    await prisma.employee.deleteMany();
    console.log('[seed] Старые данные удалены, начинаю заново.');
  }

  let serialIdx = 0;

  for (let e = 0; e < PEOPLE.length; e++) {
    const [fullName, department, position] = PEOPLE[e];
    const username = translit(fullName);
    const employee = await prisma.employee.create({
      data: {
        fullName,
        email: `${username}@customs.by`,
        adUsername: username,
        department,
        position,
        isActive: e !== 14, // один неактивный для демонстрации фильтра
      },
    });

    for (const { offsetDays } of PLAN[e]) {
      const validTo = new Date(now + offsetDays * DAY);
      const validFrom = new Date(validTo.getTime() - 365 * DAY);
      const revoked = REVOKED_SERIALS.has(serialIdx);
      const status = revoked ? 'revoked' : offsetDays <= 0 ? 'expired' : 'active';
      const serial = hex(16, serialIdx + 7);
      const fileKey = `certificates/demo/${serial}.cer`;

      await prisma.certificate.create({
        data: {
          serialNumber: serial,
          thumbprint: hex(40, serialIdx + 101),
          subjectKeyId: hex(20, serialIdx + 211),
          subjectCN: fullName,
          subjectEmail: employee.email,
          issuer: 'УЦ ГТК (демо)',
          validFrom,
          validTo,
          certType: serialIdx % 2 === 0 ? 'cer' : 'p7b',
          fileKey,
          status,
          notes: NOTES[serialIdx] ?? null,
          uploadedBy: 'admin',
          uploadedAt: new Date(validFrom.getTime() + 2 * DAY),
          employeeId: employee.id,
        },
      });

      // Фиктивное содержимое файла, чтобы скачивание в превью работало.
      await minio.putObject(
        BUCKET,
        fileKey,
        Buffer.from(`Demo certificate file for ${fullName} (serial ${serial})\n`),
        undefined,
        { 'Content-Type': 'application/pkix-cert' },
      );

      serialIdx++;
    }
  }

  const employees = await prisma.employee.count();
  const certificates = await prisma.certificate.count();
  console.log(`[seed] Готово: ${employees} сотрудников, ${certificates} сертификатов, файлы в MinIO.`);
}

main()
  .catch((error) => {
    console.error('[seed] Ошибка:', error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
