const API_URL = 'https://api.favorit-parts.ru/hs/hsprice/';

function sendJson(res, status, data) {
  if (res.destroyed) return;
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
  });
  res.end(JSON.stringify(data));
}

// Один и тот же прокси используется Vite и сервером готовой сборки.
export function createFavoritProxy({ apiKey = '', fetchImpl = fetch, timeout = 20000 } = {}) {
  return async (req, res, next) => {
    const requestUrl = new URL(req.url, 'http://localhost');
    if (requestUrl.pathname !== '/api/price') return next();
    if (req.method !== 'GET') {
      res.setHeader('Allow', 'GET');
      return sendJson(res, 405, { error: 'Поддерживается только GET-запрос.' });
    }

    const number = requestUrl.searchParams.get('number')?.trim();
    const brand = requestUrl.searchParams.get('brand')?.trim();
    if (!number) return sendJson(res, 400, { error: 'Empty number goods!' });
    if (!apiKey.trim()) {
      return sendJson(res, 503, {
        error: 'Поиск ещё не подключён. Укажите ключ покупателя FAVORIT_API_KEY в файле .env и перезапустите приложение.',
      });
    }

    const upstreamUrl = new URL(API_URL);
    upstreamUrl.search = new URLSearchParams({ key: apiKey.trim(), number });
    if (brand) {
      upstreamUrl.searchParams.set('brand', brand);
      upstreamUrl.searchParams.set('analogues', 'on');
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);
    const abort = () => controller.abort();
    res.on('close', abort);
    try {
      const response = await fetchImpl(upstreamUrl, {
        headers: { Accept: 'application/json' },
        signal: controller.signal,
        redirect: 'error',
      });
      const raw = await response.text();
      if (!raw.trim() && response.ok) return sendJson(res, 200, { goods: [] });
      // Не возвращаем браузеру возможное отражение ключа во внешнем ответе.
      const data = JSON.parse(raw.split(apiKey.trim()).join('[hidden]'));
      sendJson(res, response.status, data);
    } catch (error) {
      const timedOut = controller.signal.aborted;
      sendJson(res, timedOut ? 504 : 502, {
        error: timedOut
          ? 'Сервис не ответил вовремя. Попробуйте ещё раз.'
          : 'Не удалось получить ответ Favorit Parts. Попробуйте ещё раз позже.',
      });
    } finally {
      clearTimeout(timer);
      res.off('close', abort);
    }
  };
}
