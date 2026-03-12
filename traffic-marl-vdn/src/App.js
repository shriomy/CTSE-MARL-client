import React, { useEffect, useRef, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import './styles/App.css';

// Layout Components
import Sidebar from './components/layout/Sidebar';
import Header from './components/layout/Header';

// Pages
import Dashboard from './pages/Dashboard';
import MapView from './pages/MapView';
import JunctionControl from './pages/JunctionControl';
import SystemAnalytics from './pages/SystemAnalytics';
import Accidents from './pages/Accidents';

// Services
import { WebSocketProvider, useWebSocket } from './services/websocket';

let accidentAudio = null;

const playAlertSound = () => {
  try {
    if (!accidentAudio) {
      accidentAudio = new Audio('/accident.mp3');
      accidentAudio.preload = 'auto';
      accidentAudio.volume = 1.0;
    }

    accidentAudio.currentTime = 0;
    const playPromise = accidentAudio.play();
    if (playPromise && typeof playPromise.catch === 'function') {
      playPromise.catch((e) => {
        // Autoplay can be blocked until the user interacts with the page.
        console.warn('Alert sound playback blocked or failed', e);
      });
    }
  } catch (e) {
    console.warn('Alert sound unavailable', e);
  }
};

const GlobalAccidentAlert = () => {
  const navigate = useNavigate();
  const { data } = useWebSocket();
  const [activeAlert, setActiveAlert] = useState(null);
  const pendingQueueRef = useRef([]);
  const seenRef = useRef(new Set());
  const suppressedRef = useRef(new Set());

  const popNextAlert = () => {
    if (pendingQueueRef.current.length) {
      const [next, ...rest] = pendingQueueRef.current;
      pendingQueueRef.current = rest;
      setActiveAlert(next);
      return;
    }
    setActiveAlert(null);
  };

  useEffect(() => {
    const onResolved = (event) => {
      const resolvedId = String(event?.detail?.id || '');
      if (!resolvedId) {
        return;
      }

      suppressedRef.current.add(resolvedId);
      pendingQueueRef.current = pendingQueueRef.current.filter(
        (item) => String(item?.id || '') !== resolvedId
      );

      setActiveAlert((prev) => {
        if (String(prev?.id || '') !== resolvedId) {
          return prev;
        }
        if (pendingQueueRef.current.length) {
          const [next, ...rest] = pendingQueueRef.current;
          pendingQueueRef.current = rest;
          return next;
        }
        return null;
      });
    };

    window.addEventListener('accident-resolved-local', onResolved);
    return () => {
      window.removeEventListener('accident-resolved-local', onResolved);
    };
  }, []);

  useEffect(() => {
    if (!data || data.type !== 'traffic_update') {
      return;
    }

    const liveAccidents = Array.isArray(data.data?.accidents?.active)
      ? data.data.accidents.active.filter((accident) => {
          const id = String(accident?.id || '');
          return id && !suppressedRef.current.has(id);
        })
      : [];

    const liveIdSet = new Set(liveAccidents.map((accident) => String(accident?.id || '')).filter(Boolean));

    pendingQueueRef.current = pendingQueueRef.current.filter((accident) =>
      liveIdSet.has(String(accident?.id || ''))
    );

    if (activeAlert && !liveIdSet.has(String(activeAlert?.id || ''))) {
      popNextAlert();
    }

    const fresh = [];
    liveAccidents.forEach((accident) => {
      const id = String(accident?.id || '');
      if (!id || seenRef.current.has(id)) {
        return;
      }
      seenRef.current.add(id);
      fresh.push(accident);
    });

    if (fresh.length) {
      pendingQueueRef.current = [...pendingQueueRef.current, ...fresh];
      if (!activeAlert) {
        const [first, ...rest] = pendingQueueRef.current;
        pendingQueueRef.current = rest;
        setActiveAlert(first);
      }
      playAlertSound();
    }
  }, [data, activeAlert]);

  const goToJunction = () => {
    const target = activeAlert?.junction_id ? `/junction-control/${activeAlert.junction_id}` : '/junction-control/J4';
    popNextAlert();
    navigate(target);
  };

  if (!activeAlert) {
    return null;
  }

  return (
    <div className="accident-alert-backdrop" role="dialog" aria-modal="true">
      <div className="accident-alert-modal">
        <div className="accident-alert-badge">LIVE ALERT</div>
        <h3>Accident has occured</h3>
        <p className="accident-alert-subtitle">Need immediate action.</p>
        <div className="accident-alert-body">
          <p>
            <strong>{activeAlert.junction_name || 'Unknown Junction'}</strong> | <strong>{activeAlert.lane_name || 'Unknown lane'}</strong>
          </p>
          <p>Camera: {activeAlert.camera || 'N/A'}</p>
          <p>Entry point: {activeAlert.entryPoint || 'N/A'}</p>
          <p>Confidence: {Number(activeAlert.confidence || 0).toFixed(3)}</p>
          <p>Time: {activeAlert.timestamp ? new Date(activeAlert.timestamp).toLocaleString() : 'N/A'}</p>
        </div>
        <div className="accident-alert-actions">
          <button type="button" className="alert-proceed-btn" onClick={goToJunction}>
            Please proceed to monitor the junction
          </button>
        </div>
      </div>
    </div>
  );
};

const AppShell = () => {
  const [systemStatus] = useState('inactive');

  return (
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
              <Route path="/accidents" element={<Accidents />} />
            </Routes>
          </div>
        </div>
        <GlobalAccidentAlert />
      </div>
    </Router>
  );
};

function App() {
  return (
    <WebSocketProvider>
      <AppShell />
    </WebSocketProvider>
  );
}

export default App;