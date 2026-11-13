'use client';

/**
 * Скачивает файл по внутреннему API-маршруту через fetch + blob, без перехода
 * в новую вкладку. Если сервер недоступен или вернул ошибку — бросает Error
 * с понятным текстом (попадает в тост), вместо страницы браузера «Сайт недоступен».
 */
export async function downloadFileFromUrl(
  url: string,
  fallbackFileName: string,
): Promise<void> {
  let response: Response;
  try {
    response = await fetch(url, { cache: 'no-store' });
  } catch {
    throw new Error('Сервер недоступен. Проверьте, что приложение запущено.');
  }

  if (!response.ok || !response.body) {
    let message = `Ошибка скачивания (${response.status})`;
    try {
      const data = (await response.json()) as { message?: string; error?: string };
      message = data.message ?? data.error ?? message;
    } catch {
      // Тело не JSON (страница ошибки) — оставляем общий текст со статусом.
    }
    throw new Error(message);
  }

  const blob = await response.blob();
  const disposition = response.headers.get('content-disposition') ?? '';
  const fileName = fileNameFromDisposition(disposition) ?? fallbackFileName;

  const link = document.createElement('a');
  const objectUrl = URL.createObjectURL(blob);
  link.href = objectUrl;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  // Откладываем отзыв URL — мгновенный revoke может оборвать загрузку в части браузеров.
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 10_000);
}

function fileNameFromDisposition(disposition: string): string | null {
  const utf8Match = /filename\*=UTF-8''([^;]+)/i.exec(disposition);
  if (utf8Match) {
    try {
      return decodeURIComponent(utf8Match[1]);
    } catch {
      return null;
    }
  }
  const plainMatch = /filename="?([^";]+)"?/i.exec(disposition);
  return plainMatch ? plainMatch[1] : null;
}
