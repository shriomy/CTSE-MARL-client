import React, { useEffect, useMemo, useState } from 'react';
import { FaChartLine, FaClock, FaFilter, FaDatabase } from 'react-icons/fa';
import { useWebSocket } from '../services/websocket';
import '../styles/SystemAnalytics.css';

const RANGE_OPTIONS = [
  { value: '3h', label: 'Past 3 Hours' },
  { value: '6h', label: 'Past 6 Hours' },
  { value: '1d', label: 'Past 1 Day' },
  { value: '7d', label: 'Past 7 Days' },
  { value: '30d', label: 'Past 30 Days' },
];

const MODE_OPTIONS = [
  { value: 'all', label: 'All Modes' },
  { value: 'marl', label: 'MARL' },
  { value: 'police', label: 'Police' },
  { value: 'fixed_20', label: 'Fixed 20s' },
  { value: 'fixed_40', label: 'Fixed 40s' },
  { value: 'fixed_60', label: 'Fixed 60s' },
];

const formatNum = (value, digits = 2) => {
  const n = Number(value || 0);
  return Number.isFinite(n) ? n.toFixed(digits) : '0.00';
};

const SystemAnalytics = () => {
  const { data, isConnected, sendMessage } = useWebSocket();
  const [rangeKey, setRangeKey] = useState('6h');
  const [modeVariant, setModeVariant] = useState('all');
  const [rows, setRows] = useState([]);
  const [totalDocs, setTotalDocs] = useState(0);
  const [generatedAt, setGeneratedAt] = useState('');
  const [loading, setLoading] = useState(false);

  const requestAnalytics = (range, mode) => {
    if (!isConnected) {
      return;
    }
    setLoading(true);
    sendMessage({
      type: 'get_analytics_summary',
      payload: {
        range,
        mode_variant: mode,
      },
    });
  };

  useEffect(() => {
    if (!isConnected) {
      return;
    }
    requestAnalytics(rangeKey, modeVariant);
  }, [isConnected]);

  useEffect(() => {
    requestAnalytics(rangeKey, modeVariant);
  }, [rangeKey, modeVariant]);

  useEffect(() => {
    if (!data || data.type !== 'analytics_update') {
      return;
    }
    const payload = data.data || {};
    setRows(Array.isArray(payload.rows) ? payload.rows : []);
    setTotalDocs(Number(payload.total_docs || 0));
    setGeneratedAt(String(payload.generated_at || ''));
    setLoading(false);
  }, [data]);

  const summary = useMemo(() => {
    if (!rows.length) {
      return {
        avgVehicleWait: 0,
        avgEmergencyWait: 0,
        avgPedWait: 0,
        avgSpeed: 0,
      };
    }

    const denom = rows.length;
    return {
      avgVehicleWait: rows.reduce((a, r) => a + Number(r.average_wait_vehicle_sec || 0), 0) / denom,
      avgEmergencyWait: rows.reduce((a, r) => a + Number(r.average_wait_emergency_sec || 0), 0) / denom,
      avgPedWait: rows.reduce((a, r) => a + Number(r.average_wait_pedestrian_sec || 0), 0) / denom,
      avgSpeed: rows.reduce((a, r) => a + Number(r.average_speed_vehicle_kmph || 0), 0) / denom,
    };
  }, [rows]);

  return (
    <div className="system-analytics-page">
      <div className="analytics-header">
        <h2><FaChartLine /> System Analytics</h2>
        <p>Database-backed summaries from <code>System_Analytics</code> lane-window logs.</p>
      </div>

      <div className="analytics-filters">
        <div className="analytics-filter">
          <label><FaClock /> Time Range</label>
          <select value={rangeKey} onChange={(e) => setRangeKey(e.target.value)}>
            {RANGE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        <div className="analytics-filter">
          <label><FaFilter /> Mode</label>
          <select value={modeVariant} onChange={(e) => setModeVariant(e.target.value)}>
            {MODE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        <div className="analytics-meta">
          <span><FaDatabase /> Windows: {totalDocs}</span>
          <span>Updated: {generatedAt ? new Date(generatedAt).toLocaleString() : '-'}</span>
        </div>
      </div>

      <div className="analytics-summary-cards">
        <div className="analytics-card">
          <span className="label">Avg Vehicle Wait</span>
          <span className="value">{formatNum(summary.avgVehicleWait, 1)}s</span>
        </div>
        <div className="analytics-card">
          <span className="label">Avg Emergency Wait</span>
          <span className="value">{formatNum(summary.avgEmergencyWait, 1)}s</span>
        </div>
        <div className="analytics-card">
          <span className="label">Avg Pedestrian Wait</span>
          <span className="value">{formatNum(summary.avgPedWait, 1)}s</span>
        </div>
        <div className="analytics-card">
          <span className="label">Avg Vehicle Speed</span>
          <span className="value">{formatNum(summary.avgSpeed, 1)} km/h</span>
        </div>
      </div>

      <div className="analytics-table-wrap">
        <table className="analytics-table">
          <thead>
            <tr>
              <th>Mode</th>
              <th>Avg Vehicle Wait (s)</th>
              <th>Avg Emergency Wait (s)</th>
              <th>Avg Pedestrian Wait (s)</th>
              <th>Avg Speed (km/h)</th>
              <th>Emergency Stops</th>
              <th>Green-No-Stopped Events</th>
              <th>Green-No-Stopped Vehicle Sec</th>
              <th>Green-No-Stopped Pedestrian Sec</th>
              <th>Throughput Avg (/min)</th>
              <th>Sample Windows</th>
            </tr>
          </thead>
          <tbody>
            {!rows.length && (
              <tr>
                <td colSpan={11} className="empty-row">
                  {loading ? 'Loading analytics...' : 'No analytics data for selected filters.'}
                </td>
              </tr>
            )}
            {rows.map((row) => (
              <tr key={row.mode_variant}>
                <td>{row.mode_variant}</td>
                <td>{formatNum(row.average_wait_vehicle_sec, 2)}</td>
                <td>{formatNum(row.average_wait_emergency_sec, 2)}</td>
                <td>{formatNum(row.average_wait_pedestrian_sec, 2)}</td>
                <td>{formatNum(row.average_speed_vehicle_kmph, 2)}</td>
                <td>{formatNum(row.emergency_vehicle_stops, 0)}</td>
                <td>{formatNum(row.green_no_stopped_events, 0)}</td>
                <td>{formatNum(row.green_no_stopped_vehicle_sec, 1)}</td>
                <td>{formatNum(row.green_no_stopped_pedestrian_sec, 1)}</td>
                <td>{formatNum(row.throughput_average_per_min, 2)}</td>
                <td>{formatNum(row.sample_windows, 0)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default SystemAnalytics;
