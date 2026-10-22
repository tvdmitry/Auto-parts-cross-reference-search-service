import { DOCUMENTATION_API_KEY } from './config.js';

const ERROR_MESSAGES = {
  'Empty key!': 'Не указан ключ покупателя. Проверьте настройку подключения.',
  'Invalid key client!': 'Ключ покупателя недействителен. Проверьте настройку подключения.',
  'Invalid access key': 'Ключ покупателя недействителен. Проверьте настройку подключения.',
  'Empty number goods!': 'Введите артикул детали.',
  'Request quota exceeded!': 'Превышен лимит запросов Favorit Parts. Повторите поиск позже.',
};

const usesDirectApi = import.meta.env?.MODE === 'pages';

export function createPartsUrl({ number, brand }, { direct = usesDirectApi } = {}) {
  const params = new URLSearchParams({ number: number.trim() });
  if (brand) {
    params.set('brand', brand);
    params.set('analogues', 'on');
  }
  if (!direct) return `/api/price?${params}`;
  params.set('key', DOCUMENTATION_API_KEY);
  return `https://api.favorit-parts.ru/hs/hsprice/?${params}`;
}

function describeError(error) {
  const message = Array.isArray(error) ? error.join(' ') : String(error);
  const known = Object.entries(ERROR_MESSAGES)
    .filter(([code]) => message.includes(code))
    .map(([, translation]) => translation);
  return known.length ? known.join(' ') : message;
}

const text = (value) => typeof value === 'string' ? value.trim() : '';
const numeric = (value) => {
  if (value === null || value === undefined || value === '' || typeof value === 'boolean') return null;
  const result = Number(value);
  return Number.isFinite(result) && result >= 0 ? result : null;
};

export function readGoods(payload) {
  if (payload?.error) throw new Error(describeError(payload.error));
  if (!Array.isArray(payload?.goods)) {
    throw new Error('Сервис вернул ответ в неизвестном формате. Повторите поиск позже.');
  }
  return payload.goods.filter((item) => item && (text(item.brand) || text(item.number) || text(item.name)));
}

export function getBrands(goods) {
  const brands = new Map();
  for (const item of goods) {
    const brand = text(item.brand);
    if (brand && !brands.has(brand)) brands.set(brand, { brand, name: text(item.name) });
  }
  return [...brands.values()].sort((a, b) => a.brand.localeCompare(b.brand, 'ru'));
}

export function getOffers(goods) {
  const offers = [];
  function addItem(item, isAnalogue) {
    if (!item || !(text(item.brand) || text(item.number) || text(item.name))) return;
    const warehouses = Array.isArray(item.warehouses)
      ? item.warehouses.filter((warehouse) => warehouse && typeof warehouse === 'object')
      : [];

    for (const warehouse of warehouses.length ? warehouses : [null]) {
      offers.push({
        id: String(offers.length),
        name: text(item.name) || 'Название не указано',
        brand: text(item.brand) || 'Не указан',
        number: text(item.number) || '—',
        isAnalogue,
        warehouse: warehouse ? text(warehouse.code) || text(warehouse.id) || 'Не указан' : 'Нет предложений',
        price: warehouse ? numeric(warehouse.price) : null,
        stock: warehouse ? numeric(warehouse.stock) : numeric(item.count),
      });
    }
    if (Array.isArray(item.analogues)) item.analogues.forEach((analogue) => addItem(analogue, true));
  }
  goods.forEach((item) => addItem(item, false));
  return offers;
}

export async function fetchParts({ number, brand, signal }) {
  const url = createPartsUrl({ number, brand });
  const timeout = AbortSignal.timeout(25000);
  let response;
  try {
    response = await fetch(url, {
      signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
      headers: { Accept: 'application/json' },
      cache: 'no-store',
      referrerPolicy: 'no-referrer',
    });
    const raw = await response.text();
    let payload;
    try {
      payload = raw.trim() ? JSON.parse(raw) : { goods: [] };
    } catch {
      throw new Error('Сервис вернул некорректный ответ. Попробуйте ещё раз позже.');
    }
    if (payload?.error) throw new Error(describeError(payload.error));
    if (!response.ok) throw new Error(`Ошибка сервиса (${response.status}). Попробуйте ещё раз позже.`);
    return readGoods(payload);
  } catch (error) {
    if (signal?.aborted) throw error;
    if (timeout.aborted) throw new Error('Сервис не ответил вовремя. Попробуйте ещё раз.');
    if (error instanceof TypeError) throw new Error('Не удалось связаться с сервисом. Проверьте подключение к сети.');
    throw error;
  }
}
