import test from 'node:test';
import assert from 'node:assert/strict';
import { createPartsUrl, fetchParts, getBrands, getOffers, readGoods } from '../src/api/parts.js';
import reducer, { brandSelected, loadBrands, loadOffers, numberChanged } from '../src/store/searchSlice.js';

test('Pages обращается только к HTTPS API Favorit и кодирует ключ и параметры', () => {
  const url = new URL(createPartsUrl({ number: '#1&+', brand: 'A&B' }, { direct: true }));
  assert.equal(url.origin, 'https://api.favorit-parts.ru');
  assert.equal(url.pathname, '/hs/hsprice/');
  assert.equal(url.searchParams.get('key'), '00000000-0000-0000-0000-000000000001');
  assert.equal(url.searchParams.get('number'), '#1&+');
  assert.equal(url.searchParams.get('brand'), 'A&B');
  assert.equal(url.searchParams.get('analogues'), 'on');
});

test('оба этапа Pages автоматически используют ключ из PDF без ввода пользователем', () => {
  for (const params of [{ number: '01089' }, { number: '01089', brand: 'ASAM' }]) {
    const url = new URL(createPartsUrl(params, { direct: true }));
    assert.equal(url.searchParams.get('key'), '00000000-0000-0000-0000-000000000001');
    assert.equal(url.searchParams.get('number'), '01089');
    assert.equal(url.searchParams.has('brand'), Boolean(params.brand));
    assert.equal(url.searchParams.get('analogues'), params.brand ? 'on' : null);
  }
  assert.equal(createPartsUrl({ number: '123' }, { direct: false }), '/api/price?number=123');
});

test('пустая структура из документации означает отсутствие результатов', () => {
  assert.deepEqual(readGoods({ goods: [{}, { brand: '', number: '', name: '', count: 0, price: 0, warehouses: [] }] }), []);
  assert.deepEqual(readGoods({ goods: [] }), []);
  assert.throws(() => readGoods({}), /неизвестном формате/);
});

test('ошибки API, включая несколько ошибок в одном ответе', () => {
  assert.throws(() => readGoods({ error: 'Invalid key client!' }), /Ключ покупателя недействителен/);
  assert.throws(() => readGoods({ error: 'Invalid access key' }), /Ключ покупателя недействителен/);
  assert.throws(() => readGoods({ error: 'Empty key! Empty number goods!' }), /ключ покупателя.*Введите артикул/s);
  assert.throws(() => readGoods({ error: ['Request quota exceeded!'] }), /Превышен лимит/);
});

test('производители без повторов и с исходными названиями', () => {
  assert.deepEqual(getBrands([
    { brand: 'MEYLE', name: 'Рычаг' }, { brand: 'MEYLE', name: 'Другой рычаг' }, { brand: '' }, { brand: 'A&B' },
  ]), [{ brand: 'A&B', name: '' }, { brand: 'MEYLE', name: 'Рычаг' }]);
});

test('цена и остаток берутся с одного склада, аналоги включены, нули сохранены', () => {
  const offers = getOffers([{
    name: 'Рычаг', number: '7160500039S', brand: 'MEYLE', price: 999999, count: 20,
    warehouses: [{ code: 'МС2', price: 12533.62, stock: 12 }, { id: 'second', price: 13000, stock: 8 }],
    analogues: [
      { name: 'Аналог', brand: 'Mapco', number: '53612/1', price: 888888, warehouses: [{ code: 'ПТ4', price: '8680.20', stock: '10' }] },
      { brand: 'MEYLE', number: '7160500039/SK', count: 0, price: 0, warehouses: [] },
      { brand: 'ZERO', number: '0', warehouses: [{ price: 0, stock: 0 }] },
    ],
  }]);
  assert.equal(offers.length, 5);
  assert.deepEqual(offers.map(({ price, stock, isAnalogue }) => ({ price, stock, isAnalogue })), [
    { price: 12533.62, stock: 12, isAnalogue: false },
    { price: 13000, stock: 8, isAnalogue: false },
    { price: 8680.2, stock: 10, isAnalogue: true },
    { price: null, stock: 0, isAnalogue: true },
    { price: 0, stock: 0, isAnalogue: true },
  ]);
  assert.equal(offers[1].warehouse, 'second');
});

test('отсутствующие числовые поля не превращаются в нулевые цену и остаток', () => {
  const [offer] = getOffers([{ brand: 'A', warehouses: [{ price: null, stock: '' }] }]);
  assert.equal(offer.price, null);
  assert.equal(offer.stock, null);
});

test('клиент кодирует артикул и бренд, запрашивает аналоги только на втором шаге', async (t) => {
  const urls = [];
  t.mock.method(globalThis, 'fetch', async (url) => {
    urls.push(new URL(url, 'http://localhost'));
    return new Response(JSON.stringify({ goods: [] }));
  });
  await fetchParts({ number: ' #1&+ ' });
  await fetchParts({ number: '#1&+', brand: 'A&B / +' });
  assert.equal(urls[0].searchParams.get('number'), '#1&+');
  assert.equal(urls[0].searchParams.has('brand'), false);
  assert.equal(urls[0].searchParams.has('analogues'), false);
  assert.equal(urls[1].searchParams.get('brand'), 'A&B / +');
  assert.equal(urls[1].searchParams.get('analogues'), 'on');
  assert.equal(urls[1].searchParams.has('key'), false);
});

test('обрабатываются HTTP-ошибки, обрыв сети, пустой и некорректный ответ', async (t) => {
  const mock = t.mock.method(globalThis, 'fetch', async () => new Response('{"error":"Invalid key client!"}', { status: 403 }));
  await assert.rejects(fetchParts({ number: '123' }), /Ключ покупателя недействителен/);
  mock.mock.mockImplementation(async () => new Response('', { status: 503 }));
  await assert.rejects(fetchParts({ number: '123' }), /503/);
  mock.mock.mockImplementation(async () => new Response('<html>Error</html>'));
  await assert.rejects(fetchParts({ number: '123' }), /некорректный ответ/);
  mock.mock.mockImplementation(async () => { throw new TypeError('Failed to fetch'); });
  await assert.rejects(fetchParts({ number: '123' }), /подключение к сети/);
  mock.mock.mockImplementation(async () => new Response(null, { status: 204 }));
  assert.deepEqual(await fetchParts({ number: '123' }), []);
});

test('смена артикула немедленно очищает данные и отбрасывает старые ответы', () => {
  let state = reducer(undefined, numberChanged('old'));
  state = reducer(state, loadBrands.pending('old-request', 'old'));
  state = reducer(state, brandSelected('MEYLE'));
  state = reducer(state, loadOffers.pending('old-offers', { number: 'old', brand: 'MEYLE' }));
  state = reducer(state, numberChanged('new'));
  state = reducer(state, loadBrands.fulfilled([{ brand: 'OLD' }], 'old-request', 'old'));
  state = reducer(state, loadOffers.fulfilled([{ name: 'OLD' }], 'old-offers', {}));
  assert.equal(state.number, 'new');
  assert.equal(state.selectedBrand, '');
  assert.deepEqual(state.brands, []);
  assert.deepEqual(state.offers, []);
  assert.equal(state.brandsStatus, 'idle');
});

test('быстрая смена производителя не позволяет старому запросу перезаписать новый', () => {
  let state = reducer(undefined, brandSelected('A'));
  state = reducer(state, loadOffers.pending('a', {}));
  state = reducer(state, brandSelected('B'));
  state = reducer(state, loadOffers.pending('b', {}));
  state = reducer(state, loadOffers.fulfilled([{ brand: 'A' }], 'a', {}));
  assert.equal(state.offersStatus, 'loading');
  assert.deepEqual(state.offers, []);
  state = reducer(state, loadOffers.fulfilled([{ brand: 'B' }], 'b', {}));
  assert.deepEqual(state.offers, [{ brand: 'B' }]);
  state = reducer(state, loadOffers.rejected(new Error('Late error'), 'a', {}));
  assert.equal(state.offersStatus, 'succeeded');
  assert.equal(state.offersError, '');
});
