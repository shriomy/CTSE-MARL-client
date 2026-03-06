import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  FaMapMarkedAlt, 
  FaSearchPlus, 
  FaSearchMinus,
  FaCrosshairs,
  FaDownload,
  FaTrafficLight
} from 'react-icons/fa';
import { useWebSocket } from '../services/websocket';
import '../styles/MapView.css';

const MapView = () => {
  const { isConnected } = useWebSocket();
  const navigate = useNavigate();
  const [zoom, setZoom] = useState(1);
  const [mapError, setMapError] = useState(false);
  
  const handleZoomIn = () => {
    setZoom(prev => Math.min(prev + 0.2, 2));
  };
  
  const handleZoomOut = () => {
    setZoom(prev => Math.max(prev - 0.2, 0.5));
  };
  
  const handleResetZoom = () => {
    setZoom(1);
  };
  
  const handleJunctionClick = (junctionId) => {
    navigate(`/junction-control/${junctionId}`);
  };

  return (
    <div className="map-view-page">
      {/* Header */}
      <div className="map-header">
        <h2 className="page-title">
          <FaMapMarkedAlt /> Network Map View
        </h2>
        <div className="map-controls">
          <button className="map-control-btn" onClick={handleZoomIn} title="Zoom In">
            <FaSearchPlus />
          </button>
          <button className="map-control-btn" onClick={handleZoomOut} title="Zoom Out">
            <FaSearchMinus />
          </button>
          <button className="map-control-btn" onClick={handleResetZoom} title="Reset Zoom">
            <FaCrosshairs />
          </button>
          <a 
            href="/Map.png" 
            download="marl-traffic-full-map.png"
            className="map-control-btn"
            title="Download Map"
          >
            <FaDownload />
          </a>
        </div>
        <div className="header-status">
          <span className={`connection-dot ${isConnected ? 'connected' : 'disconnected'}`}></span>
          {isConnected ? 'Live' : 'Offline'}
        </div>
      </div>
      
      {/* Map Container */}
      <div className="map-container-full">
        <div 
          className="map-wrapper"
          style={{ transform: `scale(${zoom})` }}
        >
          <img 
            src="/Map.png" 
            alt="Complete MARL Traffic Network"
            className="network-map"
            onError={() => setMapError(true)}
          />
          
          {/* Interactive Junction Overlays */}
          <div className="junction-overlays">
            {/* J1 - SLIIT Campus */}
            <div 
              className="junction-marker j1"
              onClick={() => handleJunctionClick('J1')}
              title="SLIIT Campus Junction"
            >
              <div className="marker-pulse"></div>
              <FaTrafficLight className="marker-icon" />
              <span className="marker-label">SLIIT</span>
            </div>
            
            {/* J4 - Weliwita Junction */}
            <div 
              className="junction-marker j4"
              onClick={() => handleJunctionClick('J4')}
              title="Weliwita Junction"
            >
              <div className="marker-pulse"></div>
              <FaTrafficLight className="marker-icon" />
              <span className="marker-label">Weliwita</span>
            </div>
            
            {/* J8 - Kaduwela Junction */}
            <div 
              className="junction-marker j8"
              onClick={() => handleJunctionClick('J8')}
              title="Kaduwela Junction"
            >
              <div className="marker-pulse"></div>
              <FaTrafficLight className="marker-icon" />
              <span className="marker-label">Kaduwela</span>
            </div>
          </div>
        </div>
        
        {mapError && (
          <div className="map-error">
            <p>⚠️ Map image not found. Please ensure the image is placed at: public/images/maps/full-map.png</p>
          </div>
        )}
      </div>
      
      {/* Map Legend */}
      <div className="map-legend">
        <h4>Map Legend</h4>
        <div className="legend-items">
          <div className="legend-item">
            <div className="legend-color junction"></div>
            <span>Traffic Light Junction</span>
          </div>
          <div className="legend-item">
            <div className="legend-color road"></div>
            <span>Main Road</span>
          </div>
          <div className="legend-item">
            <div className="legend-color pedestrian"></div>
            <span>Pedestrian Crossing</span>
          </div>
          <div className="legend-item">
            <div className="legend-color emergency"></div>
            <span>Emergency Route</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MapView;