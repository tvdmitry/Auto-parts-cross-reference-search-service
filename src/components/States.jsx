import Icon from './Icon.jsx';

export function Loader({ children }) {
  return <div className="state-message" role="status">
    <span className="spinner-border text-success" aria-hidden="true" />
    <span>{children}</span>
  </div>;
}

export function EmptyState({ icon = 'search', title, children }) {
  return <div className="empty-state" role="status">
    <span className="empty-icon"><Icon name={icon} size={27} /></span>
    <h3>{title}</h3>
    <p>{children}</p>
  </div>;
}

export function ErrorState({ message, onRetry }) {
  return <div className="error-state alert alert-danger mb-0" role="alert">
    <Icon name="alert" size={23} />
    <div><h3>Не удалось выполнить поиск</h3><p>{message}</p>
      <button type="button" className="btn btn-outline-danger btn-sm" onClick={onRetry}>Повторить запрос</button>
    </div>
  </div>;
}
