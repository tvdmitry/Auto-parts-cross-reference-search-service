import { useCallback, useEffect, useRef, useState } from 'react';

const BATCH_SIZE = 20;
const priceFormatter = new Intl.NumberFormat('ru-RU', {
  style: 'currency', currency: 'RUB', minimumFractionDigits: 2,
});
const stockFormatter = new Intl.NumberFormat('ru-RU');

export default function OffersTable({ offers }) {
  const [visibleCount, setVisibleCount] = useState(BATCH_SIZE);
  const scrollRef = useRef(null);
  const moreRef = useRef(null);
  const shownCount = Math.min(visibleCount, offers.length);
  const hasMore = shownCount < offers.length;
  const showMore = useCallback(() => {
    setVisibleCount((count) => Math.min(count + BATCH_SIZE, offers.length));
  }, [offers.length]);

  useEffect(() => {
    if (!hasMore || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) showMore();
    }, { root: scrollRef.current, rootMargin: '0px 0px 160px 0px' });
    observer.observe(moreRef.current);
    return () => observer.disconnect();
  }, [hasMore, showMore]);

  return <>
    <div ref={scrollRef} className="table-responsive offers-scroll" role="region" aria-label="Таблица предложений" aria-describedby="offers-progress" tabIndex={0}>
      <table className="table offers-table align-middle mb-0">
        <caption className="visually-hidden">Искомая деталь и аналоги: наименование, производитель, склад, остаток и цена</caption>
        <thead><tr>
          <th scope="col">Наименование / Артикул</th>
          <th scope="col">Производитель</th>
          <th scope="col">Склад</th>
          <th scope="col" className="text-end">Остаток</th>
          <th scope="col" className="text-end">Цена</th>
        </tr></thead>
        <tbody>{offers.slice(0, shownCount).map((offer) => <tr key={offer.id}>
          <td><span className={`kind-label ${offer.isAnalogue ? '' : 'kind-original'}`}>{offer.isAnalogue ? 'Аналог' : 'Искомая деталь'}</span>
            <div className="part-name">{offer.name}</div><span className="part-number">{offer.number}</span></td>
          <td className="brand-cell">{offer.brand}</td>
          <td className="warehouse-cell">{offer.warehouse}</td>
          <td className="text-end text-nowrap"><span className={offer.stock === 0 ? 'stock-zero' : offer.stock > 0 ? 'stock-positive' : ''}>
            {offer.stock === null ? 'Не указан' : `${stockFormatter.format(offer.stock)} шт.`}
          </span></td>
          <td className="text-end text-nowrap price-cell">{offer.price === null ? <span className="price-missing">Не указана</span> : priceFormatter.format(offer.price)}</td>
        </tr>)}</tbody>
      </table>
      {hasMore && <div ref={moreRef} className="offers-more">
        <button type="button" className="btn btn-sm btn-outline-success" onClick={showMore}>Показать ещё</button>
      </div>}
    </div>
    <div id="offers-progress" className="offers-progress" role="status" aria-live="polite" aria-atomic="true">
      <span>Показано {shownCount} из {offers.length}</span>
      <span>{hasMore ? 'Прокрутите таблицу вниз, чтобы увидеть ещё' : 'Все предложения показаны'}</span>
    </div>
  </>;
}
