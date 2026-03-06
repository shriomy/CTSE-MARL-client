import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { 
  FaTrafficLight, 
  FaRoad, 
  FaCar, 
  FaClock, 
  FaExclamationTriangle,
  FaAmbulance,
  FaWalking,
  FaTachometerAlt,
  FaChartLine,
  FaMapMarkedAlt,
  FaChevronDown
} from 'react-icons/fa';
import { Line, Pie } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
} from 'chart.js';
import { useWebSocket } from '../services/websocket';
import '../styles/JunctionControl.css';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

// Junction configuration
const JUNCTION_CONFIG = {
  'J1': {
    id: 'J1',
    name: 'SLIIT Campus',
    location: 'Malabe',
    type: 'three_way',
    lanes: [
      { 
        id: 'west', 
        name: 'Malabe Road', 
        direction: 'West',
        signals: ['red', 'yellow', 'green'],
        currentSignal: 'red'
      },
      { 
        id: 'east', 
        name: 'New Kandy Road', 
        direction: 'East',
        signals: ['red', 'yellow', 'green'],
        currentSignal: 'green'
      },
      { 
        id: 'north', 
        name: 'Kaduwela Road', 
        direction: 'North',
        signals: ['red', 'yellow', 'green'],
        currentSignal: 'red'
      }
    ],
    roadNames: {
      west: 'Malabe Road',
      east: 'New Kandy Road',
      north: 'Kaduwela Road'
    }
  },
  'J4': {
    id: 'J4',
    name: 'Weliwita Junction',
    location: 'Kaduwela',
    type: 'pedestrian',
    lanes: [
      { 
        id: 'west', 
        name: 'New Kandy Road', 
        direction: 'West',
        signals: ['red', 'yellow', 'green'],
        currentSignal: 'red'
      },
      { 
        id: 'north', 
        name: 'Weliwita Road', 
        direction: 'North',
        signals: ['red', 'yellow', 'green'],
        currentSignal: 'red'
      },
      { 
        id: 'east', 
        name: 'Kaduwela Road', 
        direction: 'East',
        signals: ['red', 'yellow', 'green'],
        currentSignal: 'yellow'
      },
      { 
        id: 'pedestrian', 
        name: 'Pedestrian Crossing', 
        direction: 'Crossing',
        signals: ['red', 'green'],
        currentSignal: 'red'
      }
    ],
    roadNames: {
      west: 'New Kandy Road',
      north: 'Weliwita Road',
      east: 'Kaduwela Road'
    }
  },
  'J8': {
    id: 'J8',
    name: 'Kaduwela Junction',
    location: 'Kaduwela',
    type: 'four_way',
    lanes: [
      { 
        id: 'north', 
        name: 'Kaduwela Road', 
        direction: 'North',
        signals: ['red', 'yellow', 'green'],
        currentSignal: 'green'
      },
      { 
        id: 'east', 
        name: 'New Kandy Road', 
        direction: 'East',
        signals: ['red', 'yellow', 'green'],
        currentSignal: 'red'
      },
      { 
        id: 'south', 
        name: 'Awissawella Road', 
        direction: 'South',
        signals: ['red', 'yellow', 'green'],
        currentSignal: 'red'
      },
      { 
        id: 'west', 
        name: 'Malabe Road', 
        direction: 'West',
        signals: ['red', 'yellow', 'green'],
        currentSignal: 'red'
      }
    ],
    roadNames: {
      north: 'Kaduwela Road',
      east: 'New Kandy Road',
      south: 'Awissawella Road',
      west: 'Malabe Road'
    }
  }
};

const JunctionControl = () => {
  const { junctionId } = useParams();
  const navigate = useNavigate();
  const { data, isConnected, sendMessage } = useWebSocket();
  
  const [controlMode, setControlMode] = useState('agent'); // 'agent', 'police', 'fixed'
  const [junctionData, setJunctionData] = useState(null);
  const [laneData, setLaneData] = useState({});
  const [timeRemaining, setTimeRemaining] = useState(18);
  const [activeGreenLane, setActiveGreenLane] = useState('north');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  
  // Get current junction config
  const junction = JUNCTION_CONFIG[junctionId] || JUNCTION_CONFIG['J1'];
  
  // List of all junctions for dropdown
  const junctionList = Object.values(JUNCTION_CONFIG);
  
  // Mock data for demonstration (replace with real data from WebSocket)
  useEffect(() => {
    // Simulate real-time data updates
    const mockLaneData = {
      west: {
        queueLength: 12,
        vehicleDensity: 0.6,
        vehiclesWaiting: 8,
        avgWaitTime: 45.2,
        pedestriansWaiting: 3,
        emergencyVehicles: 0,
        avgSpeed: 12.5,
        currentSignal: 'red'
      },
      north: {
        queueLength: 4,
        vehicleDensity: 0.2,
        vehiclesWaiting: 3,
        avgWaitTime: 12.8,
        pedestriansWaiting: 5,
        emergencyVehicles: 1,
        avgSpeed: 28.7,
        currentSignal: 'green'
      },
      east: {
        queueLength: 18,
        vehicleDensity: 0.8,
        vehiclesWaiting: 15,
        avgWaitTime: 68.5,
        pedestriansWaiting: 2,
        emergencyVehicles: 0,
        avgSpeed: 5.2,
        currentSignal: 'red'
      },
      south: {
        queueLength: 9,
        vehicleDensity: 0.4,
        vehiclesWaiting: 7,
        avgWaitTime: 32.1,
        pedestriansWaiting: 4,
        emergencyVehicles: 0,
        avgSpeed: 18.3,
        currentSignal: 'red'
      },
      pedestrian: {
        queueLength: 12,
        pedestriansWaiting: 12,
        avgWaitTime: 25.4,
        currentSignal: 'red'
      }
    };
    
    setLaneData(mockLaneData);
    
    // Set active green lane based on junction type
    if (junctionId === 'J1') {
      setActiveGreenLane('east');
    } else if (junctionId === 'J4') {
      setActiveGreenLane('east');
    } else {
      setActiveGreenLane('north');
    }
    
    // Simulate signal changes
    const interval = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          // Switch to next lane
          const lanes = junction.lanes.filter(l => l.id !== 'pedestrian');
          const currentIndex = lanes.findIndex(l => l.id === activeGreenLane);
          const nextIndex = (currentIndex + 1) % lanes.length;
          setActiveGreenLane(lanes[nextIndex].id);
          return 18;
        }
        return prev - 1;
      });
    }, 1000);
    
    return () => clearInterval(interval);
  }, [junctionId, activeGreenLane, junction.lanes]);
  
  // Update lane signals based on active green
  useEffect(() => {
    setLaneData(prev => {
      const updated = { ...prev };
      junction.lanes.forEach(lane => {
        if (lane.id === activeGreenLane) {
          updated[lane.id] = { ...updated[lane.id], currentSignal: 'green' };
        } else if (lane.id === 'pedestrian') {
          updated[lane.id] = { ...updated[lane.id], currentSignal: 'red' };
        } else {
          updated[lane.id] = { ...updated[lane.id], currentSignal: 'red' };
        }
      });
      return updated;
    });
  }, [activeGreenLane, junction.lanes]);
  
  const handleModeSwitch = (mode) => {
    setControlMode(mode);
    if (isConnected) {
      sendMessage({
        type: 'control_mode_change',
        junction: junctionId,
        mode: mode
      });
    }
  };
  
  const handleJunctionChange = (newJunctionId) => {
    navigate(`/junction-control/${newJunctionId}`);
    setIsDropdownOpen(false);
  };
  
  const getControlBadge = () => {
    switch(controlMode) {
      case 'agent': return { text: 'MARL Agent', class: 'badge-agent' };
      case 'police': return { text: 'Police Officer', class: 'badge-police' };
      case 'fixed': return { text: 'Fixed Time Controller', class: 'badge-fixed' };
      default: return { text: 'Unknown', class: '' };
    }
  };
  
  const getActiveGreenLaneName = () => {
    const lane = junction.lanes.find(l => l.id === activeGreenLane);
    return lane ? lane.name : 'Unknown';
  };
  
  // Chart data for wait time trends
  const waitTimeChartData = {
    labels: ['12:00', '12:05', '12:10', '12:15', '12:20', '12:25', '12:30'],
    datasets: junction.lanes.filter(l => l.id !== 'pedestrian').map((lane, index) => ({
      label: lane.name,
      data: [45, 52, 38, 41, 55, 48, 62].map(v => v + (index * 5)),
      borderColor: index === 0 ? '#FF6B6B' : index === 1 ? '#4ECDC4' : index === 2 ? '#FFD166' : '#06D6A0',
      backgroundColor: 'transparent',
      tension: 0.4
    }))
  };
  
  // Chart data for traffic distribution
  const distributionChartData = {
    labels: junction.lanes.filter(l => l.id !== 'pedestrian').map(l => l.name),
    datasets: [{
      data: [35, 25, 20, 20].slice(0, junction.lanes.filter(l => l.id !== 'pedestrian').length),
      backgroundColor: ['#FF6B6B', '#4ECDC4', '#FFD166', '#06D6A0'],
      borderWidth: 0
    }]
  };
  
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: { usePointStyle: true, boxWidth: 8 }
      }
    }
  };

  return (
    <div className="junction-control-page">
      {/* Header with dropdown selector */}
      <div className="control-header">
        <div className="junction-selector">
          <div 
            className="selected-junction"
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          >
            <FaTrafficLight className="selector-icon" />
            <div className="selector-text">
              <span className="current-label">Current Junction:</span>
              <span className="current-name">{junction.name}</span>
            </div>
            <FaChevronDown className={`dropdown-arrow ${isDropdownOpen ? 'open' : ''}`} />
          </div>
          
          {isDropdownOpen && (
            <div className="dropdown-menu">
              {junctionList.map(j => (
                <div 
                  key={j.id}
                  className={`dropdown-item ${j.id === junctionId ? 'active' : ''}`}
                  onClick={() => handleJunctionChange(j.id)}
                >
                  <span className="item-name">{j.name}</span>
                  <span className="item-location">{j.location}</span>
                  {j.id === junctionId && <span className="item-check">✓</span>}
                </div>
              ))}
            </div>
          )}
        </div>
        
        <div className="header-status">
          <span className={`connection-dot ${isConnected ? 'connected' : 'disconnected'}`}></span>
          {isConnected ? 'Live' : 'Offline'}
        </div>
      </div>
      
      {/* Main content - 3 sections */}
      <div className="control-content">
        
        {/* SECTION 1: Junction Live Control Panel */}
        <div className="live-control-section">
          <h2 className="section-title">
            <FaTrafficLight /> Junction Live View
          </h2>
          
          <div className="live-control-row">
            {/* Left - SUMO Map (placeholder) */}
            <div className="map-container">
              <div className="map-placeholder">
                <FaMapMarkedAlt className="map-icon" />
                <p>SUMO Simulation View</p>
                <small>Junction {junction.name}</small>
                <div className="map-coordinates">
                  <span>Lat: 6.9271° N</span>
                  <span>Lng: 79.9612° E</span>
                </div>
              </div>
            </div>
            
            {/* Right - Control Panel */}
            <div className="control-panel">
              <div className="panel-header">
                <h3>{junction.name}</h3>
                <p className="junction-location">{junction.location}</p>
              </div>
              
              <div className="control-mode-info">
                <span className="control-label">Controlled by:</span>
                <span className={`control-badge ${getControlBadge().class}`}>
                  {getControlBadge().text}
                </span>
              </div>
              
              <div className="mode-switches">
                <button 
                  className={`mode-switch ${controlMode === 'police' ? 'active' : ''}`}
                  onClick={() => handleModeSwitch('police')}
                >
                  <span className="switch-icon">👮</span>
                  <span className="switch-text">Switch to Policemen Mode</span>
                </button>
                
                <button 
                  className={`mode-switch ${controlMode === 'agent' ? 'active' : ''}`}
                  onClick={() => handleModeSwitch('agent')}
                >
                  <span className="switch-icon">🤖</span>
                  <span className="switch-text">Switch to MARL Agent</span>
                </button>
                
                <button 
                  className={`mode-switch ${controlMode === 'fixed' ? 'active' : ''}`}
                  onClick={() => handleModeSwitch('fixed')}
                >
                  <span className="switch-icon">⏱️</span>
                  <span className="switch-text">Switch to Fixed Time Control</span>
                </button>
              </div>
              
              {/* Active Phase Information */}
              <div className="active-phase-info">
                <h4>Current Phase Information</h4>
                <div className="phase-details">
                  <div className="phase-road">
                    <FaRoad /> {getActiveGreenLaneName()} - <span className="phase-green">GREEN</span>
                  </div>
                  <div className="phase-timer">
                    <FaClock /> Time remaining: <strong>{timeRemaining}s</strong>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* SECTION 2: Lane Specifics */}
        <div className="lane-specifics-section">
          <h2 className="section-title">
            <FaRoad /> Lane Specifics
          </h2>
          
          <div className="lane-grid">
            {junction.lanes.map(lane => {
              const data = laneData[lane.id] || {};
              const isPedestrian = lane.id === 'pedestrian';
              
              return (
                <div key={lane.id} className={`lane-card ${lane.id}`}>
                  <div className="lane-header">
                    <h4>{lane.name}</h4>
                    <div className="signal-indicators">
                      {lane.signals.map(signal => (
                        <div 
                          key={signal}
                          className={`signal-beam ${signal} ${data.currentSignal === signal ? 'active' : ''}`}
                          title={`${signal.toUpperCase()} signal`}
                        />
                      ))}
                    </div>
                  </div>
                  
                  <div className="lane-stats">
                    {!isPedestrian && (
                      <>
                        <div className="stat-row">
                          <div className="stat-item">
                            <span className="stat-label">Queue Length</span>
                            <span className="stat-value">{data.queueLength || 0}</span>
                          </div>
                          <div className="stat-item">
                            <span className="stat-label">Vehicle Density</span>
                            <span className="stat-value">{((data.vehicleDensity || 0) * 100).toFixed(0)}%</span>
                          </div>
                        </div>
                        
                        <div className="stat-row">
                          <div className="stat-item">
                            <span className="stat-label">Vehicles Waiting</span>
                            <span className="stat-value">{data.vehiclesWaiting || 0}</span>
                          </div>
                          <div className="stat-item">
                            <span className="stat-label">Avg Wait Time</span>
                            <span className="stat-value">{data.avgWaitTime || 0}s</span>
                          </div>
                        </div>
                        
                        <div className="stat-row">
                          <div className="stat-item">
                            <span className="stat-label">Pedestrians</span>
                            <span className="stat-value">{data.pedestriansWaiting || 0}</span>
                          </div>
                          <div className="stat-item">
                            <span className="stat-label">Emergency</span>
                            <span className="stat-value emergency">{data.emergencyVehicles || 0}</span>
                          </div>
                        </div>
                        
                        <div className="stat-row">
                          <div className="stat-item">
                            <span className="stat-label">Avg Speed</span>
                            <span className="stat-value">{data.avgSpeed || 0} km/h</span>
                          </div>
                          <div className="stat-item">
                            <span className="stat-label">Signal</span>
                            <span className={`stat-value signal-${data.currentSignal || 'red'}`}>
                              {data.currentSignal?.toUpperCase() || 'RED'}
                            </span>
                          </div>
                        </div>
                      </>
                    )}
                    
                    {isPedestrian && (
                      <>
                        <div className="stat-row">
                          <div className="stat-item">
                            <span className="stat-label">Pedestrians Waiting</span>
                            <span className="stat-value">{data.pedestriansWaiting || 0}</span>
                          </div>
                          <div className="stat-item">
                            <span className="stat-label">Queue Length</span>
                            <span className="stat-value">{data.queueLength || 0}</span>
                          </div>
                        </div>
                        
                        <div className="stat-row">
                          <div className="stat-item">
                            <span className="stat-label">Avg Wait Time</span>
                            <span className="stat-value">{data.avgWaitTime || 0}s</span>
                          </div>
                          <div className="stat-item">
                            <span className="stat-label">Signal</span>
                            <span className={`stat-value signal-${data.currentSignal || 'red'}`}>
                              {data.currentSignal?.toUpperCase() || 'RED'}
                            </span>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        
        {/* SECTION 3: Junction Analytics */}
        <div className="junction-analytics-section">
          <h2 className="section-title">
            <FaChartLine /> Junction Analytics
          </h2>
          
          <div className="analytics-grid">
            {/* Summary Cards */}
            <div className="summary-cards-row">
              <div className="summary-card">
                <div className="summary-icon blue">
                  <FaCar />
                </div>
                <div className="summary-content">
                  <span className="summary-value">93</span>
                  <span className="summary-label">TOTAL VEHICLES</span>
                </div>
              </div>
              
              <div className="summary-card">
                <div className="summary-icon red">
                  <FaAmbulance />
                </div>
                <div className="summary-content">
                  <span className="summary-value">1</span>
                  <span className="summary-label">EMERGENCY VEHICLES</span>
                </div>
              </div>
              
              <div className="summary-card">
                <div className="summary-icon orange">
                  <FaClock />
                </div>
                <div className="summary-content">
                  <span className="summary-value">70</span>
                  <span className="summary-label">VEHICLES WAITING</span>
                </div>
              </div>
              
              <div className="summary-card">
                <div className="summary-icon green">
                  <FaTachometerAlt />
                </div>
                <div className="summary-content">
                  <span className="summary-value">28.7</span>
                  <span className="summary-label">AVG SPEED</span>
                </div>
              </div>
              
              <div className="summary-card">
                <div className="summary-icon purple">
                  <FaClock />
                </div>
                <div className="summary-content">
                  <span className="summary-value">44.6s</span>
                  <span className="summary-label">AVG WAIT TIME</span>
                </div>
              </div>
              
              <div className="summary-card">
                <div className="summary-icon yellow">
                  <FaExclamationTriangle />
                </div>
                <div className="summary-content">
                  <span className="summary-value">1</span>
                  <span className="summary-label">BLOCKAGES</span>
                </div>
              </div>
              
              <div className="summary-card">
                <div className="summary-icon teal">
                  <FaWalking />
                </div>
                <div className="summary-content">
                  <span className="summary-value">37</span>
                  <span className="summary-label">PEDESTRIANS</span>
                </div>
              </div>
              
              <div className="summary-card">
                <div className="summary-icon marl">
                  <FaTrafficLight />
                </div>
                <div className="summary-content">
                  <span className="summary-value">8.7</span>
                  <span className="summary-label">AGENT REWARD</span>
                </div>
              </div>
            </div>
            
            {/* Charts Row */}
            <div className="charts-row">
              <div className="chart-card">
                <h4>Wait Time Trends</h4>
                <div className="chart-container">
                  <Line data={waitTimeChartData} options={chartOptions} />
                </div>
                <div className="chart-legend">
                  {junction.lanes.filter(l => l.id !== 'pedestrian').map(lane => (
                    <span key={lane.id} className="legend-item">
                      <span className={`legend-color ${lane.id}`}></span>
                      {lane.name}
                    </span>
                  ))}
                </div>
              </div>
              
              <div className="chart-card">
                <h4>Traffic Distribution by Lane</h4>
                <div className="chart-container pie-container">
                  <Pie data={distributionChartData} options={chartOptions} />
                </div>
                <div className="chart-legend">
                  {junction.lanes.filter(l => l.id !== 'pedestrian').map((lane, index) => (
                    <span key={lane.id} className="legend-item">
                      <span className={`legend-color ${lane.id}`}></span>
                      {lane.name}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default JunctionControl;