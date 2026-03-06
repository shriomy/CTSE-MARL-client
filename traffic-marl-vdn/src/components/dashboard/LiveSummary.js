import React from 'react';
import { FaExclamationTriangle, FaAmbulance, FaCar, FaTrafficLight } from 'react-icons/fa';

const LiveSummary = ({ summaryData }) => {
  const {
    accidents = 0,
    emergencyVehicles = 0,
    totalVehicles = 0,
    trafficLevel = 'low'
  } = summaryData;

  const getTrafficLevelColor = () => {
    switch(trafficLevel) {
      case 'low': return '#2ecc71';
      case 'medium': return '#f39c12';
      case 'high': return '#e74c3c';
      default: return '#95a5a6';
    }
  };

  const summaryItems = [
    {
      icon: <FaExclamationTriangle />,
      label: 'Accidents',
      value: accidents,
      unit: ''
    },
    {
      icon: <FaAmbulance />,
      label: 'Emergency Vehicles',
      value: emergencyVehicles,
      unit: ''
    },
    {
      icon: <FaCar />,
      label: 'Total Vehicles',
      value: totalVehicles,
      unit: ''
    },
    {
      icon: <FaTrafficLight />,
      label: 'Traffic Level',
      value: trafficLevel.toUpperCase(),
      unit: '',
      customColor: getTrafficLevelColor()
    }
  ];

  return (
    <div className="summary-grid">
      {summaryItems.map((item, index) => (
        <div key={index} className="summary-card">
          <div className="summary-icon" style={item.customColor ? { background: item.customColor } : {}}>
            {item.icon}
          </div>
          <div className="summary-content">
            <h4>{item.label}</h4>
            <div className="summary-value">
              {item.value}
              {item.unit && <span className="summary-unit">{item.unit}</span>}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default LiveSummary;