import { HistoryList, useHistory } from './History.jsx';
export default function Dashboard({ user, onNav }) {
  const { items, error } = useHistory();
  return (
    <section aria-labelledby="dash-h">
      <h2 id="dash-h">Welcome, {user.name}</h2>
      <p className="support">See where your own reasoning disagrees.</p>
      <button type="button" className="primary" onClick={() => onNav('new')}>New Crosscheck</button>
      <h3>Recent activity</h3>
      <HistoryList items={items?.slice(0, 3)} error={error} onOpen={(id) => onNav('history', id)} />
    </section>
  );
}
