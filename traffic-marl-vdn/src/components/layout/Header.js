import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { format } from 'date-fns';
import '../../styles/Header.css';

const Header = () => {
  const location = useLocation();
  const [currentTime, setCurrentTime] = useState(new Date());
  
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    
    return () => clearInterval(timer);
  }, []);
  
  const getPageTitle = () => {
    const path = location.pathname;
    switch(path) {
      case '/dashboard': return 'Dashboard';
      case '/map': return 'View Map';
      case '/junction-control/': return 'Junction Control';
      case '/analytics': return 'System Analytics';
      case '/accidents': return 'Accidents';
      default: return 'Dashboard';
    }
  };
  
  return (
    <div className="header">
      <h1 className="page-title">{getPageTitle()}</h1>
      <div className="header-time">
        {format(currentTime, 'HH:mm:ss')}
      </div>
    </div>
  );
};

export default Header;