import React, { useEffect, useMemo, useState } from 'react'
import axios from 'axios'
import './App.css'

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:5174';

function useLocalStorage(key, initialValue) {
  const [value, setValue] = useState(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch {
      return initialValue;
    }
  });
  useEffect(() => {
    try { window.localStorage.setItem(key, JSON.stringify(value)); } catch {}
  }, [key, value]);
  return [value, setValue];
}

export default function App() {
  const [currencies, setCurrencies] = useState({});
  const [from, setFrom] = useState('USD');
  const [to, setTo] = useState('PKR');
  const [amount, setAmount] = useState('1');
  const [result, setResult] = useState(null);
  const [rate, setRate] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingCurrencies, setLoadingCurrencies] = useState(true);

  const [history, setHistory] = useLocalStorage('cc_history_v1', []);

  const currencyList = useMemo(() => {
    return Object.entries(currencies || {}).map(([code, meta]) => ({ code, name: meta.name }))
      .sort((a,b) => a.code.localeCompare(b.code));
  }, [currencies]);

  useEffect(() => {
    let cancelled = false;
    async function fetchCurrencies() {
      try {
        setLoadingCurrencies(true);
        const resp = await axios.get(`${API_BASE}/api/currencies`);
        if (!cancelled) setCurrencies(resp.data.data || {});
      } catch (e) {
        console.error(e);
      } finally {
        if (!cancelled) setLoadingCurrencies(false);
      }
    }
    fetchCurrencies();
    return () => { cancelled = true; }
  }, []);

  const onSwap = () => {
    setFrom(to); setTo(from); setResult(null); setRate(null);
  };

  const onConvert = async (e) => {
    e.preventDefault();
    if (!amount || isNaN(Number(amount))) return;
    setLoading(true); setResult(null); setRate(null);
    try {
      const resp = await axios.get(`${API_BASE}/api/convert`, {
        params: { from, to, amount: Number(amount) }
      });
      const { result, rate, fetchedAt } = resp.data;
      setResult(result); setRate(rate);
      const record = { id: crypto.randomUUID(), from, to, amount: Number(amount), result, rate, at: fetchedAt };
      setHistory([record, ...history].slice(0, 50));
    } catch (e) {
      console.error(e);
      alert('Conversion failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-vh-100 d-flex flex-column align-items-center justify-content-start p-3">
      <div className="w-100 container-max">
        <h1 className="h3 fw-bold text-center mt-2">💱 Currency Converter</h1>
        <p className="text-center text-muted mb-4">Real-Time Rates, Anytime, Anywhere.</p>

        <div className="card shadow-sm border-0 rounded-4 mb-3">
          <div className="card-body">
            <form onSubmit={onConvert}>
              <div className="mb-3">
                <label className="form-label">Amount</label>
                <input type="number" step="any" className="form-control form-control-lg"
                  value={amount} onChange={e => setAmount(e.target.value)} placeholder="Enter amount" required min="0" />
              </div>

              <div className="row g-2 align-items-end">
                <div className="col-5">
                  <label className="form-label">From</label>
                  <select className="form-select form-select-lg" value={from} onChange={e => setFrom(e.target.value)} disabled={loadingCurrencies}>
                    {loadingCurrencies ? <option>Loading...</option> :
                      currencyList.map(c => <option key={c.code} value={c.code}>{c.code} — {c.name}</option>)
                    }
                  </select>
                </div>
                <div className="col-2 d-flex justify-content-center">
                  <button type="button" className="btn btn-outline-secondary w-100 mt-4" onClick={onSwap} disabled={loading || loadingCurrencies}>⇄</button>
                </div>
                <div className="col-5">
                  <label className="form-label">To</label>
                  <select className="form-select form-select-lg" value={to} onChange={e => setTo(e.target.value)} disabled={loadingCurrencies}>
                    {loadingCurrencies ? <option>Loading...</option> :
                      currencyList.map(c => <option key={c.code} value={c.code}>{c.code} — {c.name}</option>)
                    }
                  </select>
                </div>
              </div>

              <div className="d-grid mt-3">
                <button type="submit" className="btn btn-primary btn-lg" disabled={loading || loadingCurrencies}>
                  {loading ? (<span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>) : null}
                  Convert
                </button>
              </div>
            </form>

            {rate !== null && result !== null && (
              <div className="alert alert-success rounded-4 mt-3 mb-0">
                <div className="d-flex justify-content-between">
                  <div className="fw-semibold">{amount} {from} → {to}</div>
                  <span className="badge bg-light text-dark rate-badge">Rate: {rate}</span>
                </div>
                <div className="display-6">{result.toLocaleString(undefined, { maximumFractionDigits: 6 })} {to}</div>
              </div>
            )}
          </div>
        </div>

        <div className="card shadow-sm border-0 rounded-4">
          <div className="card-body">
            <div className="d-flex justify-content-between align-items-center mb-2">
              <h2 className="h5 m-0">History</h2>
              <button className="btn btn-sm btn-outline-danger" onClick={() => setHistory([])}>Clear</button>
            </div>
            {history.length === 0 ? (
              <p className="text-muted mb-0">No conversions yet.</p>
            ) : (
              <ul className="list-group list-group-flush">
                {history.map(h => (
                  <li key={h.id} className="list-group-item history-item">
                    <div className="d-flex justify-content-between">
                      <div>
                        <strong>{h.amount} {h.from}</strong> → <strong>{h.result.toLocaleString(undefined, { maximumFractionDigits: 6 })} {h.to}</strong>
                        <div className="text-muted small">Rate {h.rate} • {new Date(h.at).toLocaleString()}</div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
        
      </div>
    </div>
  )
}
