import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import './styles/App.css';

// Layout Components
import Sidebar from './components/layout/Sidebar';
import Header from './components/layout/Header';

// Pages
import Dashboard from './pages/Dashboard';
import MapView from './pages/MapView';
import JunctionControl from './pages/JunctionControl';
import SystemAnalytics from './pages/SystemAnalytics';
import Pedestrians from './pages/Pedestrians';
import EmergencyVehicles from './pages/EmergencyVehicles';

// Services
import { WebSocketProvider } from './services/websocket';

function App() {
  const [systemStatus, setSystemStatus] = useState('inactive');

  return (
    <WebSocketProvider>
      <Router>
        <div className="app">
          <Sidebar systemStatus={systemStatus} />
          <div className="main-content">
            <Header />
            <div className="page-content">
              <Routes>
                <Route path="/" element={<Navigate to="/dashboard" />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/map" element={<MapView />} />
                <Route path="/junction-control/:junctionId?" element={<JunctionControl />} />
                <Route path="/analytics" element={<SystemAnalytics />} />
                <Route path="/pedestrians" element={<Pedestrians />} />
                <Route path="/emergency" element={<EmergencyVehicles />} />
              </Routes>
            </div>
          </div>
        </div>
      </Router>
    </WebSocketProvider>
  );
}

export default App;