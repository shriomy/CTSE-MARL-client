import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  FaTachometerAlt, 
  FaMapMarkedAlt, 
  FaTrafficLight, 
  FaChartLine,
  FaWalking,
  FaAmbulance,
  FaTrafficLight as FaTrafficLightIcon
} from 'react-icons/fa';
import '../../styles/Sidebar.css';

const Sidebar = ({ systemStatus }) => {
  const navItems = [
    { path: '/dashboard', icon: <FaTachometerAlt />, label: 'Dashboard' },
    { path: '/map', icon: <FaMapMarkedAlt />, label: 'View Map' },
    { path: '/junction-control', icon: <FaTrafficLight />, label: 'Junction Control' },
    { path: '/analytics', icon: <FaChartLine />, label: 'System Analytics' },
    { path: '/pedestrians', icon: <FaWalking />, label: 'Pedestrians' },
    { path: '/emergency', icon: <FaAmbulance />, label: 'Emergency Vehicles' }
  ];

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <div className="logo">
          <FaTrafficLightIcon className="logo-icon" />
          <h2>MARL Traffic Control</h2>
        </div>
        <div className="logo-subtitle">Sri Lanka, Malabe</div>
        
        <div className="system-status">
          <span className={`status-dot ${systemStatus === 'active' ? 'active' : 'inactive'}`}></span>
          <span>System {systemStatus === 'active' ? 'Active' : 'Inactive'}</span>
        </div>
      </div>

      <nav className="sidebar-nav">
        {navItems.map((item, index) => (
          <NavLink
            key={index}
            to={item.path}
            className={({ isActive }) => 
              `nav-item ${isActive ? 'active' : ''}`
            }
          >
            <span className="nav-icon">{item.icon}</span>
            <span className="nav-label">{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="version">Version 1.0.0</div>
        <div className="copyright">© 2026 MARL Traffic Control</div>
      </div>
    </div>
  );
};

export default Sidebar;