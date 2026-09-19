import React, { useState, useEffect } from 'react';
import { api } from '../services/api';

export default function BusinessDashboard() {
  const [period, setPeriod] = useState('all');
  const [summary, setSummary] = useState(null);
  const [log, setLog] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [period]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [s, l] = await Promise.all([
        api.getRevenueSummary(period),
        api.getRevenueLog(),
      ]);
      setSummary(s.summary);
      setLog(l.entries || []);
    } catch (err) {
      console.error('Failed to load revenue:', err);
    } finally {
      setLoading(false);
    }
  };

  const fmt = (n) => 'KES ' + (n || 0).toLocaleString();

  return (
    <div style={{ padding: 20, maxWidth: 600, margin: '0 auto', fontFamily: 'system-ui' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h1 style={{ margin: 0, fontSize: 24 }}>💰 Business Dashboard</h1>
        <span style={{ fontSize: 12, color: '#999' }}>Owner only</span>
      </div>

      {/* Period selector */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {['today', 'month', 'all'].map(p => (
          <button key={p} onClick={() => setPeriod(p)} style={{
            flex: 1, padding: 10, border: 'none', borderRadius: 10, cursor: 'pointer',
            background: period === p ? '#4CAF50' : '#F5F7FA',
            color: period === p ? 'white' : '#333',
            fontWeight: 'bold', fontSize: 12
          }}>{p.toUpperCase()}</button>
        ))}
      </div>

      {loading && <p style={{ textAlign: 'center', color: '#999' }}>Loading...</p>}

      {summary && (
        <>
          {/* Main revenue card */}
          <div style={{ 
            background: 'linear-gradient(135deg, #1B5E20, #4CAF50)', 
            borderRadius: 16, padding: 24, color: 'white', marginBottom: 20 
          }}>
            <p style={{ margin: 0, opacity: 0.8, fontSize: 12 }}>NET REVENUE</p>
            <h2 style={{ margin: '8px 0', fontSize: 36 }}>{fmt(summary.netRevenue)}</h2>
            <p style={{ margin: 0, opacity: 0.9, fontSize: 12 }}>
              from {summary.transactions} transaction{summary.transactions !== 1 ? 's' : ''}
            </p>
          </div>

          {/* Breakdown grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
            <StatCard label="Gross Revenue" value={fmt(summary.grossRevenue)} color="#2196F3" />
            <StatCard label="Marketing Budget" value={fmt(summary.marketingBudget)} color="#FF9800" />
            <StatCard label="Logistics Fees" value={fmt(summary.logisticsFee)} color="#9C27B0" />
            <StatCard label="Service Fees" value={fmt(summary.serviceFee)} color="#4CAF50" />
          </div>

          {/* Marketing note */}
          <div style={{ 
            background: '#FFF8E1', borderRadius: 12, padding: 16, marginBottom: 20,
            border: '1px solid #FFE082'
          }}>
            <strong style={{ color: '#E65100', fontSize: 13 }}>💡 Marketing Rule</strong>
            <p style={{ margin: '6px 0 0', fontSize: 12, color: '#666' }}>
              20% of net revenue is your marketing budget. Reinvest it into TikTok micro-influencers, 
              farmer barazas, and WhatsApp referrals.
            </p>
          </div>

          {/* Recent transactions */}
          <h3 style={{ fontSize: 16, marginBottom: 12 }}>Recent Transactions</h3>
          {log.length === 0 ? (
            <p style={{ color: '#999', fontSize: 13, textAlign: 'center', padding: 20 }}>
              No transactions yet. Complete your first escrow to see revenue here.
            </p>
          ) : (
            log.map((entry, i) => (
              <div key={i} style={{
                background: 'white', borderRadius: 12, padding: 14, marginBottom: 8,
                border: '1px solid #eee', display: 'flex', justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <div>
                  <strong style={{ fontSize: 13 }}>{entry.orderId}</strong>
                  <p style={{ margin: '2px 0', fontSize: 11, color: '#999' }}>
                    Escrow: {entry.escrowId}
                  </p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <strong style={{ color: '#4CAF50', fontSize: 14 }}>+{fmt(entry.netRevenue)}</strong>
                  <p style={{ margin: '2px 0', fontSize: 10, color: '#999' }}>
                    from {fmt(entry.amount)}
                  </p>
                </div>
              </div>
            ))
          )}
        </>
      )}
    </div>
  );
}

function StatCard({ label, value, color }) {
  return (
    <div style={{
      background: 'white', borderRadius: 12, padding: 16,
      border: '1px solid #eee', borderLeft: `4px solid ${color}`
    }}>
      <p style={{ margin: 0, fontSize: 11, color: '#999' }}>{label}</p>
      <p style={{ margin: '6px 0 0', fontSize: 18, fontWeight: 'bold', color }}>{value}</p>
    </div>
  );
}
