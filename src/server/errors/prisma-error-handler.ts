import { Prisma } from '@/generated/prisma/client';
import { ConflictError, NotFoundError, DatabaseError, BadRequestError } from './app-error';

export function handlePrismaError(error: unknown): never {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    switch (error.code) {
      case 'P2002':
        // нарушение unique — например дубликат serialNumber
        const field = (error.meta?.target as string[])?.join(', ');
        throw new ConflictError(`Duplicate value for field: ${field}`);

      case 'P2025':
        // запись не найдена при update/delete
        throw new NotFoundError('Record not found');

      case 'P2003':
        // внешний ключ не существует
        throw new DatabaseError('Related record not found');

      case 'P2000':
        // значение слишком большое для типа столбца
        throw new BadRequestError('Input value too long for field');

      case 'P2001':
        // запись не найдена по условию поиска
        throw new NotFoundError('Record does not exist');

      case 'P2004':
        // нарушение внешнего ограничения
        throw new ConflictError('A constraint failed on the database');

      case 'P2011':
        // null violation
        throw new BadRequestError('Null constraint violation');

      case 'P2012':
        // отсутствует обязательное поле
        throw new BadRequestError('Missing required field');

      case 'P2013':
        // отсутствует обязательное значение аргумента
        throw new BadRequestError('Missing required argument');

      case 'P2014':
        // удаление одного элемента нарушает связь many-to-many
        throw new ConflictError('Cannot delete record because it is referenced elsewhere');

      case 'P2021': {
        const table = String(error.meta?.table ?? 'unknown');
        throw new DatabaseError(
          `Таблица «${table}» отсутствует в базе. Выполните миграции: run-migrate.ps1 или npx prisma migrate deploy`,
        );
      }

      case 'P2022': {
        const column = String(error.meta?.column ?? 'unknown');
        throw new DatabaseError(
          `Колонка «${column}» отсутствует в базе. Выполните миграции: run-migrate.ps1 или npx prisma migrate deploy`,
        );
      }

      default:
        throw new DatabaseError(`Database error: ${error.code}`);
    }
  }

  if (error instanceof Prisma.PrismaClientValidationError) {
    // неправильные данные переданы в Prisma
    throw new DatabaseError('Invalid data provided');
  }

  throw error; // пробрасываем если не Prisma-ошибка
}