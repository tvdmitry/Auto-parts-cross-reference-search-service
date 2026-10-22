const priceFormatter = new Intl.NumberFormat('ru-RU', {
  style: 'currency', currency: 'RUB', minimumFractionDigits: 2,
});
const stockFormatter = new Intl.NumberFormat('ru-RU');

export default function OffersTable({ offers }) {
  return <div className="table-responsive offers-scroll" role="region" aria-label="Таблица предложений" tabIndex={0}>
    <table className="table offers-table align-middle mb-0">
      <caption className="visually-hidden">Искомая деталь и аналоги: наименование, производитель, склад, остаток и цена</caption>
      <thead><tr>
        <th scope="col">Наименование / Артикул</th>
        <th scope="col">Производитель</th>
        <th scope="col">Склад</th>
        <th scope="col" className="text-end">Остаток</th>
        <th scope="col" className="text-end">Цена</th>
      </tr></thead>
      <tbody>{offers.map((offer) => <tr key={offer.id}>
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
  </div>;
}
