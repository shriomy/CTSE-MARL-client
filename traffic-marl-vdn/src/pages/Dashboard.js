import React, { useState, useEffect } from 'react';
import '../styles/Dashboard.css';
import { JUNCTIONS, TRAFFIC_THRESHOLDS } from '../constants';
import { useWebSocket } from '../services/websocket';

// Components
import JunctionCard from '../components/dashboard/JunctionCard';
import QueueCard from '../components/dashboard/QueueCard';
import LiveSummary from '../components/dashboard/LiveSummary';

const Dashboard = () => {
  const { data, isConnected, sendMessage } = useWebSocket();
  const [junctionData, setJunctionData] = useState({});
  const [queueData, setQueueData] = useState({});
  const [networkMode, setNetworkMode] = useState('marl');
  const [summaryData, setSummaryData] = useState({
    accidents: 0,
    emergencyVehicles: 0,
    totalVehicles: 0,
    trafficLevel: 'low'
  });

  const getModeLabel = (mode) => {
    if (mode === 'manual') return 'Police Officer';
    if (mode === 'fixed') return 'Fixed Time';
    if (mode === 'marl') return 'MARL Agent';
    return 'Mixed';
  };

  const updateJunctionModes = (modes) => {
    setJunctionData(prev => {
      const next = { ...prev };
      Object.entries(modes || {}).forEach(([junctionId, mode]) => {
        next[junctionId] = {
          ...(next[junctionId] || {}),
          controlMode: mode
        };
      });
      return next;
    });
  };

  const handleGlobalModeSwitch = (mode) => {
    setNetworkMode(mode);
    if (!isConnected) {
      return;
    }

    sendMessage({
      type: 'set_global_mode',
      mode
    });
  };

  useEffect(() => {
    if (!isConnected) {
      return;
    }
    sendMessage({ type: 'get_runtime_state' });
  }, [isConnected, sendMessage]);

  useEffect(() => {
    if (data) {
      if (data.type === 'mode_update') {
        const modePayload = data.data || {};
        if (modePayload.global_mode) {
          setNetworkMode(modePayload.global_mode);
        }
        if (modePayload.junction_modes) {
          updateJunctionModes(modePayload.junction_modes);
        }
      }

      if (data.type === 'traffic_update') {
        const packet = data.data || {};

        if (packet.modes) {
          updateJunctionModes(packet.modes);
        }

        if (typeof packet.vehicle_count === 'number' || typeof packet.avg_speed === 'number') {
          setSummaryData(prev => ({
            ...prev,
            totalVehicles: typeof packet.vehicle_count === 'number' ? packet.vehicle_count : prev.totalVehicles,
            avgSpeed: typeof packet.avg_speed === 'number' ? packet.avg_speed : prev.avgSpeed,
            reward: typeof packet.reward === 'number' ? packet.reward : prev.reward
          }));
        }
      }

      // Backward compatibility payloads
      if (data.agents) {
        setJunctionData(data.agents);
      }
      if (data.queueData) {
        setQueueData(data.queueData);
      }
      if (data.summary) {
        setSummaryData(data.summary);
      }
    }
  }, [data]);

  // Simulated data for demonstration (remove when connected to real data)
  useEffect(() => {
    if (!isConnected) {
      // Demo data
      const demoJunctionData = {
        'J1': {
          controlMode: 'marl',
          vehiclesWaiting: 32,
          vehicleDensity: 0.4,
          avgWaitTime: 28.7,
          pedestrians: 42,
          emergencyVehicles: 0,
          accidents: 0,
          trafficLevel: 'low'
        },
        'J4': {
          controlMode: 'marl',
          vehiclesWaiting: 78,
          vehicleDensity: 0.6,
          avgWaitTime: 42.3,
          pedestrians: 15,
          emergencyVehicles: 1,
          accidents: 0,
          trafficLevel: 'medium'
        },
        'J8': {
          controlMode: 'marl',
          vehiclesWaiting: 142,
          vehicleDensity: 0.8,
          avgWaitTime: 68.5,
          pedestrians: 24,
          emergencyVehicles: 2,
          accidents: 1,
          trafficLevel: 'high'
        }
      };
      
      const demoQueueData = {
        'J1': {
          lanes: ['west', 'north', 'east'],
          values: [6, 12, 8]
        },
        'J4': {
          lanes: ['west', 'east'],
          values: [4, 20]
        },
        'J8': {
          lanes: ['north', 'east', 'south', 'west'],
          values: [6, 12, 15, 8]
        }
      };
      
      setJunctionData(demoJunctionData);
      setQueueData(demoQueueData);
      setSummaryData({
        accidents: 1,
        emergencyVehicles: 3,
        totalVehicles: 252,
        trafficLevel: 'medium'
      });
    }
  }, [isConnected]);

  return (
    <div className="dashboard-page">
      {/* Current Traffic Density Section */}
      <div className="section-header">
        <h2 className="section-title">Current Traffic Density</h2>
        <div className="network-control-wrap">
          <span className="network-control-label">Network Control:</span>
          <div className="network-mode-switches">
            <button
              className={`network-mode-btn ${networkMode === 'marl' ? 'active marl' : ''}`}
              onClick={() => handleGlobalModeSwitch('marl')}
              type="button"
            >
              MARL
            </button>
            <button
              className={`network-mode-btn ${networkMode === 'manual' ? 'active manual' : ''}`}
              onClick={() => handleGlobalModeSwitch('manual')}
              type="button"
            >
              Police
            </button>
            <button
              className={`network-mode-btn ${networkMode === 'fixed' ? 'active fixed' : ''}`}
              onClick={() => handleGlobalModeSwitch('fixed')}
              type="button"
            >
              Fixed
            </button>
          </div>
          <span className="network-mode-text">{getModeLabel(networkMode)}</span>
        </div>
      </div>

      <div className="junctions-grid">
        {JUNCTIONS.map(junction => (
          <JunctionCard
            key={junction.id}
            junction={junction}
            data={junctionData[junction.id] || {}}
          />
        ))}
      </div>

      {/* Queue Lengths Section */}
      <div className="queue-cards">
        {JUNCTIONS.map(junction => (
          <QueueCard
            key={junction.id}
            junction={junction}
            queueData={queueData[junction.id]}
          />
        ))}
      </div>

      {/* Live Traffic Summary Section */}
      <div className="section-header" style={{ marginTop: '20px' }}>
        <h2 className="section-title">Live Traffic Summary</h2>
      </div>

      <LiveSummary summaryData={summaryData} />

      {/* Connection Status Indicator (small) */}
      <div style={{ 
        position: 'fixed', 
        bottom: '20px', 
        right: '20px',
        padding: '8px 16px',
        background: isConnected ? '#2ecc71' : '#e74c3c',
        color: 'white',
        borderRadius: '20px',
        fontSize: '12px',
        fontWeight: '600',
        boxShadow: '0 4px 10px rgba(0,0,0,0.2)',
        zIndex: 1000
      }}>
        {isConnected ? '● LIVE' : '○ OFFLINE'}
      </div>
    </div>
  );
};

export default Dashboard;