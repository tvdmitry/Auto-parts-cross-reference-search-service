import { useState } from 'react';
import Icon from './Icon.jsx';

export default function ApiConnection({ connected, onConnect, onDisconnect }) {
  const [draftKey, setDraftKey] = useState('');

  if (connected) return <div className="connection-status">
    <span><Icon name="check" size={17} /> Ключ покупателя указан</span>
    <button className="btn btn-link btn-sm" type="button" onClick={onDisconnect}>Изменить ключ</button>
  </div>;

  return <section className="card connection-card" aria-labelledby="connection-title">
    <h2 id="connection-title">Подключите поиск</h2>
    <p>Введите личный ключ покупателя из кабинета Favorit Parts.</p>
    <form onSubmit={(event) => {
      event.preventDefault();
      if (!draftKey.trim()) return;
      onConnect(draftKey.trim());
      setDraftKey('');
    }}>
      <label htmlFor="api-key" className="form-label">Ключ покупателя</label>
      <div className="connection-inputs">
        <input id="api-key" className="form-control" type="password" value={draftKey}
          onChange={(event) => setDraftKey(event.target.value)} autoComplete="off" spellCheck={false}
          required placeholder="Введите ключ Favorit Parts" aria-describedby="key-help" />
        <button type="submit" className="btn btn-success" disabled={!draftKey.trim()}>Продолжить</button>
      </div>
      <p id="key-help" className="form-text">Ключ используется только в этой вкладке и отправляется напрямую Favorit Parts. После перезагрузки введите его снова.</p>
    </form>
  </section>;
}
