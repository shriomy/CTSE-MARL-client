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

  // Get color based on item type
  const getItemColor = (label) => {
    switch(label) {
      case 'Accidents':
        return '#e74c3c'; // Red for accidents
      case 'Emergency Vehicles':
        return '#f39c12'; // Orange for emergency vehicles
      case 'Total Vehicles':
        return '#3498db'; // Blue for normal vehicles
      case 'Traffic Level':
        return getTrafficLevelColor(); // Dynamic color based on level
      default:
        return '#667eea';
    }
  };

  // Get background style based on item type
  const getIconBackground = (label) => {
    const color = getItemColor(label);
    
    // Special gradient for accidents to make it more alert-like
    if (label === 'Accidents') {
      return {
        background: 'linear-gradient(135deg, #c0392b 0%, #e74c3c 100%)',
        boxShadow: '0 0 15px rgba(231, 76, 60, 0.5)'
      };
    }
    
    // Special style for emergency vehicles
    if (label === 'Emergency Vehicles') {
      return {
        background: 'linear-gradient(135deg, #e67e22 0%, #f39c12 100%)',
        boxShadow: '0 0 10px rgba(243, 156, 18, 0.4)'
      };
    }
    
    return { background: color };
  };

  const summaryItems = [
    {
      icon: <FaExclamationTriangle />,
      label: 'Accidents',
      value: accidents,
      unit: '',
      alertStyle: true
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
      unit: ''
    }
  ];

  return (
    <div className="summary-grid">
      {summaryItems.map((item, index) => (
        <div key={index} className="summary-card">
          <div className="summary-icon" style={getIconBackground(item.label)}>
            {item.icon}
          </div>
          <div className="summary-content">
            <h4 style={{ color: getItemColor(item.label) }}>{item.label}</h4>
            <div className="summary-value" style={{ fontSize: item.label === 'Traffic Level' ? '36px' : '48px' }}>
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