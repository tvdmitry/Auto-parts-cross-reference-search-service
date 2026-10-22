import { useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { brandSelected, loadBrands, loadOffers, numberChanged } from './store/searchSlice.js';
import Icon from './components/Icon.jsx';
import { EmptyState, ErrorState, Loader } from './components/States.jsx';
import OffersTable from './components/OffersTable.jsx';

export default function App() {
  const dispatch = useDispatch();
  const search = useSelector((state) => state.search);
  const { number, selectedBrand, brands, offers, brandsStatus, offersStatus } = search;
  const [brandsRetry, retryBrands] = useState(0);
  const [offersRetry, retryOffers] = useState(0);
  const inputRef = useRef(null);

  useEffect(() => {
    if (!number.trim()) return;
    let request;
    const timer = setTimeout(() => { request = dispatch(loadBrands(number.trim())); }, 500);
    return () => { clearTimeout(timer); request?.abort(); };
  }, [dispatch, number, brandsRetry]);

  useEffect(() => {
    if (!selectedBrand) return;
    const request = dispatch(loadOffers({ number: number.trim(), brand: selectedBrand }));
    return () => request.abort();
  }, [dispatch, number, selectedBrand, offersRetry]);

  const clearSearch = () => {
    dispatch(numberChanged(''));
    inputRef.current?.focus();
  };
  const waitingForBrands = number.trim() && (brandsStatus === 'idle' || brandsStatus === 'loading');

  return <>
    <header className="site-header">
      <div className="container app-container header-inner">
        <div className="brand-lockup"><span className="brand-mark" aria-hidden="true">f<span>.</span></span>
          <div><span className="brand-title">FAVORIT PARTS</span><span className="brand-subtitle">Подбор автозапчастей</span></div>
        </div>
        <span className="header-caption"><Icon name="box" size={17} /> Каталог предложений</span>
      </div>
    </header>

    <main className="container app-container">
      <div className="page-intro">
        <span className="eyebrow">ПОИСК ПО АРТИКУЛУ</span>
        <h1>Нужная деталь. Все предложения.</h1>
        <p>Введите артикул и выберите производителя, чтобы найти запчасть и её аналоги.</p>
      </div>

      <ol className="search-steps" aria-label="Этапы поиска">
        <li className={selectedBrand ? 'step-complete' : 'step-current'} aria-current={!selectedBrand ? 'step' : undefined}>
          <span className="step-number">{selectedBrand ? <Icon name="check" size={16} /> : '01'}</span>
          <span>Артикул и производитель</span>
        </li>
        <li className={selectedBrand ? 'step-current' : ''} aria-current={selectedBrand ? 'step' : undefined}>
          <span className="step-number">02</span><span>Предложения и аналоги</span>
        </li>
      </ol>

      <section className="card search-card" aria-labelledby="search-title">
        <div className="section-heading"><div><span className="section-kicker">ШАГ 01</span><h2 id="search-title">Найдите производителя</h2></div><Icon name="search" size={24} /></div>
        <div className="search-field">
          <label htmlFor="part-number" className="form-label">Артикул запчасти</label>
          <div className="input-wrap">
            <Icon name="search" size={21} />
            <input ref={inputRef} id="part-number" className="form-control" value={number} onChange={(event) => dispatch(numberChanged(event.target.value))}
              placeholder="Например, 7160500039S" autoComplete="off" spellCheck={false} aria-describedby="search-help" />
            {number && <button type="button" className="clear-button" onClick={clearSearch} aria-label="Очистить артикул"><Icon name="close" size={18} /></button>}
          </div>
          <p id="search-help" className="form-text">Поиск начнётся автоматически после ввода артикула.</p>
        </div>

        <div className="brands-region" aria-busy={Boolean(waitingForBrands)}>
          {!number.trim() && <EmptyState title="Начните с артикула">Он указан на детали, упаковке или в каталоге производителя.</EmptyState>}
          {waitingForBrands && <Loader>Ищем производителей…</Loader>}
          {brandsStatus === 'failed' && <ErrorState message={search.brandsError} onRetry={() => retryBrands((value) => value + 1)} />}
          {brandsStatus === 'succeeded' && (brands.length ? <>
            <div className="results-label"><h3>Выберите производителя</h3><span>{brands.length} найдено</span></div>
            <div className="brands-grid">{brands.map(({ brand, name }) => <button key={brand} type="button"
              className={`brand-option ${selectedBrand === brand ? 'selected' : ''}`} aria-pressed={selectedBrand === brand}
              onClick={() => { if (selectedBrand !== brand) dispatch(brandSelected(brand)); }}>
              <span><strong>{brand}</strong><span className="brand-description">{name || 'Предложения по этому артикулу'}</span></span>
              <Icon name={selectedBrand === brand ? 'check' : 'arrow'} size={20} />
            </button>)}</div>
          </> : <EmptyState title="Производители не найдены">По артикулу «{number.trim()}» нет результатов. Проверьте номер детали.</EmptyState>)}
        </div>
      </section>

      <section className={`card offers-card ${selectedBrand ? '' : 'awaiting-selection'}`} aria-labelledby="offers-title">
        <div className="section-heading"><div><span className="section-kicker">ШАГ 02</span><h2 id="offers-title">Предложения и аналоги</h2></div>
          {offersStatus === 'succeeded' && <span className="results-count">Позиций: {offers.length}</span>}
        </div>
        {selectedBrand && <p className="selected-summary"><span>{selectedBrand}</span><span className="summary-divider" />{number.trim()}</p>}
        <div aria-busy={Boolean(selectedBrand && (offersStatus === 'loading' || offersStatus === 'idle'))}>
          {!selectedBrand && <EmptyState icon="box" title="Здесь появятся предложения">Выберите производителя на первом шаге, чтобы увидеть цены и остатки.</EmptyState>}
          {selectedBrand && (offersStatus === 'loading' || offersStatus === 'idle') && <Loader>Получаем предложения и аналоги…</Loader>}
          {offersStatus === 'failed' && <div className="offers-state"><ErrorState message={search.offersError} onRetry={() => retryOffers((value) => value + 1)} /></div>}
          {offersStatus === 'succeeded' && (offers.length ? <OffersTable offers={offers} /> : <EmptyState icon="box" title="Предложений пока нет">Для этого производителя ничего не найдено. Выберите другого производителя или измените артикул.</EmptyState>)}
        </div>
        {offersStatus === 'succeeded' && offers.length > 0 && <div className="table-footnote">Каждая строка — отдельное предложение склада. Позиции с нулевым остатком также показаны.</div>}
      </section>
    </main>
  </>;
}
