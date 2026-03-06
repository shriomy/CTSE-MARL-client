import React from 'react';
import { useNavigate } from 'react-router-dom';

const JunctionCard = ({ junction, data }) => {
  const navigate = useNavigate();

  const {
    controlMode = 'marl',
    vehiclesWaiting = 0,
    vehicleDensity = 0,
    avgWaitTime = 0,
    pedestrians = 0,
    emergencyVehicles = 0,
    accidents = 0,
    trafficLevel = 'low'
  } = data;

  const getControlBadgeClass = () => {
    switch(controlMode) {
      case 'marl': return 'control-badge marl';
      case 'manual': return 'control-badge police';
      case 'fixed': return 'control-badge fixed';
      default: return 'control-badge';
    }
  };

  const getControlLabel = () => {
    switch(controlMode) {
      case 'marl': return 'MARL Agent';
      case 'manual': return 'Police Officer';
      case 'fixed': return 'Fixed Time';
      default: return 'Unknown';
    }
  };

  const openJunctionControl = () => {
    navigate(`/junction-control/${junction.id}`);
  };

  const handleKeyDown = (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      openJunctionControl();
    }
  };

  return (
    <div
      className="junction-card clickable"
      onClick={openJunctionControl}
      onKeyDown={handleKeyDown}
      role="button"
      tabIndex={0}
      aria-label={`Open ${junction.name} control page`}
    >
      <div className="junction-header">
        <span className="junction-name">{junction.name}</span>
        <span className={`traffic-status ${trafficLevel}`}>
          {trafficLevel.toUpperCase()} TRAFFIC
        </span>
      </div>
      
      <div className="junction-body">
        <div className="control-info">
          <span>Controlled By:</span>
          <span className={getControlBadgeClass()}>
            {getControlLabel()}
          </span>
        </div>

        <div className="stats-grid">
          <div className="stat-item">
            <div className="stat-label">Vehicles Waiting</div>
            <div className="stat-value">{vehiclesWaiting}</div>
          </div>
          
          <div className="stat-item">
            <div className="stat-label">Vehicle Density</div>
            <div className="stat-value">{(vehicleDensity * 100).toFixed(0)}<span className="stat-unit">%</span></div>
          </div>
          
          <div className="stat-item">
            <div className="stat-label">Avg Wait Time</div>
            <div className="stat-value">{avgWaitTime}<span className="stat-unit">s</span></div>
          </div>
          
          <div className="stat-item">
            <div className="stat-label">Pedestrians</div>
            <div className="stat-value">{pedestrians}</div>
          </div>
          
          <div className="stat-item">
            <div className="stat-label">Emergency</div>
            <div className="stat-value">{emergencyVehicles}</div>
          </div>
          
          <div className="stat-item">
            <div className="stat-label">Accidents</div>
            <div className="stat-value">{accidents}</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default JunctionCard;