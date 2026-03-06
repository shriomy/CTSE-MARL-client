import React, { useState, useEffect } from 'react';
import '../styles/Dashboard.css';
import { JUNCTIONS, TRAFFIC_THRESHOLDS } from '../constants';
import { useWebSocket } from '../services/websocket';

// Components
import JunctionCard from '../components/dashboard/JunctionCard';
import QueueCard from '../components/dashboard/QueueCard';
import LiveSummary from '../components/dashboard/LiveSummary';

const Dashboard = () => {
  const { data, isConnected } = useWebSocket();
  const [junctionData, setJunctionData] = useState({});
  const [queueData, setQueueData] = useState({});
  const [summaryData, setSummaryData] = useState({
    accidents: 0,
    emergencyVehicles: 0,
    totalVehicles: 0,
    trafficLevel: 'low'
  });

  useEffect(() => {
    if (data) {
      // Process junction data from WebSocket
      if (data.agents) {
        setJunctionData(data.agents);
      }
      
      // Process queue data
      if (data.queueData) {
        setQueueData(data.queueData);
      }
      
      // Update summary
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
          lanes: ['west', 'east'],
          values: [4, 20]
        },
        'J4': {
          lanes: ['west', 'north', 'east'],
          values: [6, 12, 8]
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
        <span className="section-subtitle">Real-time monitoring of all active junctions</span>
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