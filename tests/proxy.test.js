import test from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { createFavoritProxy } from '../server/favoritProxy.js';

async function request(options, url, method = 'GET') {
  const res = new EventEmitter();
  res.setHeader = () => {};
  res.writeHead = (status, headers) => { res.status = status; res.headers = headers; };
  res.end = (raw) => { res.body = JSON.parse(raw); };
  await createFavoritProxy(options)({ url, method }, res, () => { res.next = true; });
  return res;
}

test('без ключа прокси показывает настройку и не обращается к API', async () => {
  const response = await request({ fetchImpl: () => { throw new Error('Must not call'); } }, '/api/price?number=123');
  assert.equal(response.status, 503);
  assert.match(response.body.error, /FAVORIT_API_KEY/);
});

test('ключ остаётся на сервере, параметры и HTTPS-адрес соответствуют спецификации', async () => {
  const calls = [];
  const fetchImpl = async (url) => { calls.push(new URL(url)); return new Response('{"goods":[]}'); };
  const options = { apiKey: 'private-test-key', fetchImpl };
  await request(options, '/api/price?number=%231%26%2B&analogues=on&key=override');
  await request(options, '/api/price?number=123&brand=A%26B');
  assert.equal(calls[0].origin, 'https://api.favorit-parts.ru');
  assert.equal(calls[0].pathname, '/hs/hsprice/');
  assert.equal(calls[0].searchParams.get('key'), 'private-test-key');
  assert.equal(calls[0].searchParams.get('number'), '#1&+');
  assert.equal(calls[0].searchParams.has('analogues'), false);
  assert.equal(calls[1].searchParams.get('brand'), 'A&B');
  assert.equal(calls[1].searchParams.get('analogues'), 'on');
});

test('прокси передаёт error от API и скрывает возможное отражение ключа', async () => {
  const response = await request({ apiKey: 'private-test-key', fetchImpl: async () => new Response('{"error":"Invalid key client! private-test-key"}', { status: 403 }) }, '/api/price?number=123');
  assert.equal(response.status, 403);
  assert.match(response.body.error, /Invalid key client!/);
  assert.ok(!response.body.error.includes('private-test-key'));
  assert.equal(response.headers['Cache-Control'], 'no-store');
});

test('сбой сети и неожиданный HTML возвращают понятную ошибку', async () => {
  for (const fetchImpl of [async () => { throw new TypeError('Network'); }, async () => new Response('<html>Error</html>')]) {
    const response = await request({ apiKey: 'test-key', fetchImpl }, '/api/price?number=123');
    assert.equal(response.status, 502);
    assert.match(response.body.error, /Не удалось получить ответ/);
  }
});

test('превышение времени ожидания останавливает внешний запрос', async () => {
  const fetchImpl = (_, { signal }) => new Promise((resolve, reject) => {
    signal.addEventListener('abort', () => reject(new Error('Aborted')), { once: true });
  });
  const response = await request({ apiKey: 'test-key', fetchImpl, timeout: 10 }, '/api/price?number=123');
  assert.equal(response.status, 504);
  assert.match(response.body.error, /не ответил вовремя/);
});

test('пустой успешный ответ, неверный метод и отсутствие артикула', async () => {
  const options = { apiKey: 'test-key', fetchImpl: async () => new Response(null, { status: 204 }) };
  const empty = await request(options, '/api/price?number=123');
  assert.equal(empty.status, 200);
  assert.deepEqual(empty.body, { goods: [] });
  assert.equal((await request(options, '/api/price?number=123', 'POST')).status, 405);
  assert.equal((await request(options, '/api/price')).status, 400);
  assert.equal((await request(options, '/')).next, true);
});
