import React, { useEffect, useMemo, useState } from 'react';
import { 
  FaChartLine, FaClock, FaFilter, FaDatabase, FaTrophy, FaArrowDown, FaArrowUp,
  FaCar, FaAmbulance, FaTachometerAlt, FaBan, FaRoad, FaCheckCircle, FaWalking
} from 'react-icons/fa';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import { 
  Chart as ChartJS, 
  CategoryScale, 
  LinearScale, 
  PointElement, 
  LineElement,
  BarElement,
  ArcElement,
  RadialLinearScale,
  Title, 
  Tooltip, 
  Legend 
} from 'chart.js';
import { useWebSocket } from '../services/websocket';
import '../styles/SystemAnalytics.css';

ChartJS.register(
  CategoryScale, 
  LinearScale, 
  PointElement, 
  LineElement,
  BarElement,
  ArcElement,
  RadialLinearScale,
  Title, 
  Tooltip, 
  Legend
);

const RANGE_OPTIONS = [
  { value: '3h', label: 'Past 3 Hours' },
  { value: '6h', label: 'Past 6 Hours' },
  { value: '1d', label: 'Past 1 Day' },
  { value: '7d', label: 'Past 7 Days' },
  { value: '30d', label: 'Past 30 Days' },
];

const COMPARISON_MODE_OPTIONS = [
  { value: 'police', label: 'Police Officer' },
  { value: 'fixed_20', label: 'Fixed 20s' },
  { value: 'fixed_40', label: 'Fixed 40s' },
  { value: 'fixed_60', label: 'Fixed 60s' },
];

const formatNum = (value, digits = 2) => {
  const n = Number(value || 0);
  return Number.isFinite(n) ? n.toFixed(digits) : '0.00';
};

const getModeLabel = (mode) => {
  const map = { marl: 'MARL', police: 'Police Officer', fixed_20: 'Fixed 20s', fixed_40: 'Fixed 40s', fixed_60: 'Fixed 60s' };
  return map[mode] || mode;
};

const SystemAnalytics = () => {
  const { data, isConnected, sendMessage } = useWebSocket();
  const [rangeKey, setRangeKey] = useState('6h');
  const [comparisonMode, setComparisonMode] = useState('police');
  const [rows, setRows] = useState([]);
  const [totalDocs, setTotalDocs] = useState(0);
  const [generatedAt, setGeneratedAt] = useState('');
  const [loading, setLoading] = useState(false);

  const requestAnalytics = (range) => {
    if (!isConnected) return;
    setLoading(true);
    sendMessage({
      type: 'get_analytics_summary',
      payload: { range, mode_variant: 'all' },
    });
  };

  useEffect(() => {
    if (!isConnected) return;
    requestAnalytics(rangeKey);
  }, [isConnected, rangeKey]);

  useEffect(() => {
    if (!data || data.type !== 'analytics_update') return;
    const payload = data.data || {};
    setRows(Array.isArray(payload.rows) ? payload.rows : []);
    setTotalDocs(Number(payload.total_docs || 0));
    setGeneratedAt(String(payload.generated_at || ''));
    setLoading(false);
  }, [data]);

  // Extract MARL and comparison mode data
  const marlData = useMemo(() => rows.find(r => r.mode_variant === 'marl') || {}, [rows]);
  const comparisonData = useMemo(() => rows.find(r => r.mode_variant === comparisonMode) || {}, [rows, comparisonMode]);

  // Metric definitions with icons
  const METRICS = [
    { key: 'average_wait_vehicle_sec', label: 'Average Wait Time', suffix: 's', lower_is_better: true, icon: FaClock },
    { key: 'average_wait_emergency_sec', label: 'Emergency Wait Time', suffix: 's', lower_is_better: true, icon: FaAmbulance },
    { key: 'average_wait_pedestrian_sec', label: 'Pedestrian Wait Time', suffix: 's', lower_is_better: true, icon: FaWalking },
    { key: 'average_speed_vehicle_kmph', label: 'Average Speed', suffix: 'km/h', lower_is_better: false, icon: FaTachometerAlt },
    { key: 'emergency_vehicle_stops', label: 'Emergency Stops', suffix: '', lower_is_better: true, icon: FaBan },
      { key: 'green_no_stopped_vehicle_sec', label: 'Green Time for Empty Vehicle Lanes', suffix: 's', lower_is_better: false, icon: FaCheckCircle },
    { key: 'green_no_stopped_pedestrian_sec', label: 'Green Time for Empty Pedestrian Lanes', suffix: 's', lower_is_better: false, icon: FaCheckCircle },
    { key: 'throughput_average_per_min', label: 'Throughput', suffix: '/min', lower_is_better: false, icon: FaCar },
  ];

  // Comparison summary logic
  const comparisonSummary = useMemo(() => {
    const comparisons = [];
    
    METRICS.forEach(metric => {
      const marlVal = Number(marlData[metric.key] || 0);
      const compVal = Number(comparisonData[metric.key] || 0);
      
      if (!marlVal || !compVal) return;
      
      const diff = marlVal - compVal;
      const pctDiff = compVal !== 0 ? ((diff / compVal) * 100) : 0;
      const isBetter = metric.lower_is_better ? (diff < 0) : (diff > 0);
      
      if (Math.abs(pctDiff) > 1) {
        comparisons.push({
          metric: metric.label,
          diff: Math.abs(diff).toFixed(1),
          pctDiff: Math.abs(pctDiff).toFixed(1),
          isBetter,
          suffix: metric.suffix,
        });
      }
    });
    
    return comparisons;
  }, [marlData, comparisonData]);

  // Chart data for metrics comparison
  const chartMetrics = [
    { key: 'average_wait_vehicle_sec', label: 'Avg Vehicle Wait', type: 'bar' },
    { key: 'average_wait_emergency_sec', label: 'Avg Emergency Wait', type: 'line' },
    { key: 'average_wait_pedestrian_sec', label: 'Avg Pedestrian Wait', type: 'bar' },
    { key: 'average_speed_vehicle_kmph', label: 'Avg Speed', type: 'line' },
    { key: 'emergency_vehicle_stops', label: 'Emergency Stops', type: 'doughnut' },
    { key: 'green_no_stopped_events', label: 'Green-No-Stopped Events', type: 'bar' },
    { key: 'green_no_stopped_vehicle_sec', label: 'Green-No-Stopped Veh', type: 'line' },
    { key: 'green_no_stopped_pedestrian_sec', label: 'Green-No-Stopped Ped', type: 'bar' },
    { key: 'throughput_average_per_min', label: 'Throughput', type: 'doughnut' },
  ];

  const comparisonCharts = useMemo(() => {
    return chartMetrics.map((metricDef, idx) => {
      const metric = METRICS.find(m => m.key === metricDef.key);
      const marlVal = Number(marlData[metricDef.key] || 0);
      const compVal = Number(comparisonData[metricDef.key] || 0);
      
      const baseChartConfig = {
        labels: [getModeLabel('marl'), getModeLabel(comparisonMode)],
        datasets: [{
          label: metricDef.label,
          data: [marlVal, compVal],
          borderColor: ['#10b981', '#ef4444'],
          backgroundColor: ['rgba(16, 185, 129, 0.2)', 'rgba(239, 68, 68, 0.2)'],
          borderWidth: 2,
          pointRadius: 5,
          pointBackgroundColor: ['#10b981', '#ef4444'],
          tension: 0.3,
          fill: false,
        }]
      };

      // Pie/Doughnut format
      const pieChartConfig = {
        labels: [getModeLabel('marl'), getModeLabel(comparisonMode)],
        datasets: [{
          label: metricDef.label,
          data: [marlVal, compVal],
          backgroundColor: ['rgba(16, 185, 129, 0.8)', 'rgba(239, 68, 68, 0.8)'],
          borderColor: ['#10b981', '#ef4444'],
          borderWidth: 2,
        }]
      };

      return {
        key: metricDef.key,
        label: metricDef.label,
        type: metricDef.type,
        data: metricDef.type === 'doughnut' ? pieChartConfig : baseChartConfig,
      };
    });
  }, [marlData, comparisonData, comparisonMode]);

  const lineChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: { display: true, position: 'bottom', labels: { usePointStyle: true, padding: 15, color: '#64748b', font: { size: 11 } } },
      tooltip: { backgroundColor: 'rgba(15,23,42,0.9)', titleColor: '#f8fafc', bodyColor: '#cbd5e1', padding: 10 }
    },
    scales: {
      x: { grid: { color: 'rgba(0,0,0,0.04)' }, ticks: { color: '#94a3b8', font: { size: 10 } } },
      y: { grid: { color: 'rgba(0,0,0,0.06)' }, ticks: { color: '#94a3b8', font: { size: 10 } }, beginAtZero: true }
    }
  };

  const barChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    indexAxis: 'y',
    plugins: {
      legend: { display: true, position: 'bottom', labels: { usePointStyle: true, padding: 15, color: '#64748b', font: { size: 11 } } },
      tooltip: { backgroundColor: 'rgba(15,23,42,0.9)', titleColor: '#f8fafc', bodyColor: '#cbd5e1', padding: 10 }
    },
    scales: {
      x: { grid: { color: 'rgba(0,0,0,0.04)' }, ticks: { color: '#94a3b8', font: { size: 10 } }, beginAtZero: true },
      y: { grid: { display: false }, ticks: { color: '#94a3b8', font: { size: 10 } } }
    }
  };

  const pieChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'bottom', labels: { usePointStyle: true, padding: 15, color: '#64748b', font: { size: 11 } } },
      tooltip: { backgroundColor: 'rgba(15,23,42,0.9)', titleColor: '#f8fafc', bodyColor: '#cbd5e1', padding: 10 }
    }
  };

  return (
    <div className="system-analytics-page">
      <div className="analytics-header">
        <h2><FaChartLine /> System Analytics</h2>
        <p>Real-time performance comparison between MARL and alternative control modes</p>
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
          <label><FaFilter /> Compare MARL vs</label>
          <select value={comparisonMode} onChange={(e) => setComparisonMode(e.target.value)}>
            {COMPARISON_MODE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        <div className="analytics-meta">
          <span><FaDatabase /> Windows: {totalDocs}</span>
          <span>Updated: {generatedAt ? new Date(generatedAt).toLocaleString() : '-'}</span>
        </div>
      </div>

      {/* Demographics Grid (Two-column comparison) */}
      <div className="analytics-comparison-section">
        
        <div className="comparison-grids">
        {/* MARL Grid (Green) */}
          <div className="analytics-grid marl">
            <div className="grid-title marl-title">
              <FaTrophy className="title-icon" />
              {getModeLabel('marl')}
            </div>
            <div className="metrics-chips">
              {METRICS.map(metric => {
                const IconComponent = metric.icon;
                return (
                  <div key={metric.key} className="metric-card">
                    <div className="metric-card-header">{metric.label}</div>
                    <div className="metric-card-content">
                      <div className="metric-card-value">
                        {formatNum(marlData[metric.key], metric.key.includes('stop') ? 0 : 1)}
                        <span className="metric-card-suffix">{metric.suffix}</span>
                      </div>
                      <div className="metric-card-icon marl-icon">
                        <IconComponent />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Comparison Mode Grid (Red) */}
          <div className="analytics-grid comparison">
            <div className="grid-title comparison-title">
              <FaFilter className="title-icon" />
              {getModeLabel(comparisonMode)}
            </div>
            <div className="metrics-chips">
              {METRICS.map(metric => {
                const IconComponent = metric.icon;
                return (
                  <div key={metric.key} className="metric-card">
                    <div className="metric-card-header">{metric.label}</div>
                    <div className="metric-card-content">
                      <div className="metric-card-value">
                        {formatNum(comparisonData[metric.key], metric.key.includes('stop') ? 0 : 1)}
                        <span className="metric-card-suffix">{metric.suffix}</span>
                      </div>
                      <div className="metric-card-icon comparison-icon">
                        <IconComponent />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Comparison Summary */}
      {comparisonSummary.length > 0 && (
        <div className="comparison-summary-section">
          <h3><FaTrophy /> Performance Summary</h3>
          <div className="summary-statements">
            {comparisonSummary.map((comp, idx) => (
              <div key={idx} className={`summary-statement ${comp.isBetter ? 'marl-wins' : 'loses'}`}>
                {comp.isBetter ? (
                  <>
                    <FaArrowUp className="summary-icon" />
                    <span className="summary-text">
                      MARL's <strong>{comp.metric}</strong> is <strong>{comp.diff} {comp.suffix}</strong> 
                      <span className="summary-pct">({comp.pctDiff}%)</span> better than {getModeLabel(comparisonMode)}
                    </span>
                  </>
                ) : (
                  <>
                    <FaArrowDown className="summary-icon" />
                    <span className="summary-text">
                      {getModeLabel(comparisonMode)}'s <strong>{comp.metric}</strong> is <strong>{comp.diff} {comp.suffix}</strong> 
                      <span className="summary-pct">({comp.pctDiff}%)</span> better than MARL
                    </span>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Comparison Graphs */}
      <div className="comparison-graphs-section">
        <h3>Comprehensive Metric Comparison</h3>
        <div className="charts-grid-full">
          {comparisonCharts.map(chart => (
            <div key={chart.key} className="chart-card">
              <h4>{chart.label}</h4>
              <div className="chart-container">
                {chart.type === 'line' && <Line data={chart.data} options={lineChartOptions} />}
                {chart.type === 'bar' && <Bar data={chart.data} options={barChartOptions} />}
                {chart.type === 'doughnut' && <Doughnut data={chart.data} options={pieChartOptions} />}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SystemAnalytics;
