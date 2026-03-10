import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaExclamationTriangle, FaClock, FaMapMarkerAlt, FaRoad, FaSmileBeam, FaCheckCircle, FaRegSmile } from 'react-icons/fa';
import { useWebSocket } from '../services/websocket';
import '../styles/Accidents.css';

const MODE_LABEL = {
  marl: 'MARL Agent',
  fixed: 'Fixed Time Controller',
  manual: 'Police Officer',
  mixed: 'Mixed mode',
};

const JUNCTION_MAP_FOCUS = {
  J1: { x: 30, y: 38, zoom: 5.2 },
  J4: { x: 0, y: 35, zoom: 8.0 },
  J8: { x: 80, y: 35, zoom: 4.5 },
};

const resolveGlobalMode = (modes) => {
  const values = Object.values(modes || {}).filter(Boolean);
  if (!values.length) {
    return 'mixed';
  }
  const unique = new Set(values);
  if (unique.size === 1) {
    return values[0];
  }
  return 'mixed';
};

const Accidents = () => {
  const navigate = useNavigate();
  const { data, isConnected, sendMessage, setFrameStreaming } = useWebSocket();
  const [activeAccidents, setActiveAccidents] = useState([]);
  const [liveFrame, setLiveFrame] = useState('');
  const [liveUpdatedAt, setLiveUpdatedAt] = useState(0);
  const lastFrameAtRef = useRef(0);
  const [globalMode, setGlobalMode] = useState('mixed');
  const [pendingResolve, setPendingResolve] = useState({});

  useEffect(() => {
    if (!isConnected) {
      return;
    }
    sendMessage({ type: 'get_runtime_state' });
  }, [isConnected, sendMessage]);

  useEffect(() => {
    if (isConnected) {
      setFrameStreaming(true);
    }
    return () => {
      setFrameStreaming(false);
    };
  }, [isConnected, setFrameStreaming]);

  useEffect(() => {
    if (!data || typeof data !== 'object') {
      return;
    }

    if (data.type === 'mode_update' && data.data?.global_mode) {
      setGlobalMode(String(data.data.global_mode));
    }

    if (data.type === 'traffic_update') {
      const packet = data.data || {};
      const active = Array.isArray(packet.accidents?.active) ? packet.accidents.active : [];
      setActiveAccidents(active);

      if (packet.modes) {
        setGlobalMode(resolveGlobalMode(packet.modes));
      }

      const frame = packet.sumo_live_frame;
      if (typeof frame === 'string' && frame.startsWith('data:image/')) {
        const now = Date.now();
        if (now - lastFrameAtRef.current < 500) {
          return;
        }
        setLiveFrame(frame);
        setLiveUpdatedAt(now);
        lastFrameAtRef.current = now;
      }

      setPendingResolve((prev) => {
        const next = { ...prev };
        Object.keys(next).forEach((id) => {
          if (!active.some((item) => String(item.id) === id)) {
            delete next[id];
          }
        });
        return next;
      });
    }
  }, [data]);

  const modeLabel = useMemo(() => MODE_LABEL[globalMode] || 'Traffic Control', [globalMode]);

  const handleOpenJunction = (junctionId) => {
    navigate(`/junction-control/${junctionId || 'J4'}`);
  };

  const handleResolveAccident = (accidentId) => {
    const id = String(accidentId || '');
    if (!id) {
      return;
    }
    setPendingResolve((prev) => ({ ...prev, [id]: true }));
    sendMessage({
      type: 'resolve_accident',
      payload: { accident_id: id },
    });
  };

  return (
    <div className="accidents-page">
      <div className="accidents-page-header">
        <h2>Accidents</h2>
        <span className={`accident-connection-pill ${isConnected ? 'online' : 'offline'}`}>
          {isConnected ? 'LIVE' : 'OFFLINE'}
        </span>
      </div>

      {!activeAccidents.length && (
        <div className="no-accidents-wrap">
          <div className="no-accidents-card">
            <div className="no-accidents-emoji-row" aria-hidden="true">
              <FaRegSmile />
              <FaSmileBeam />
              <FaRegSmile />
            </div>
            <div className="no-accidents-title-row">
              <FaCheckCircle className="no-accidents-check" />
              <h3>No accidents near by</h3>
            </div>
            <p className="no-accidents-message">{modeLabel} is doing a great job!</p>
            <div className="no-accidents-subtext">Traffic looks calm and stable right now.</div>
          </div>
        </div>
      )}

      {activeAccidents.map((accident) => {
        const id = String(accident.id || '');
        const focus = JUNCTION_MAP_FOCUS[accident.junction_id] || { x: 50, y: 50, zoom: 1.8 };
        return (
          <div key={id || `${accident.timestamp}-${accident.entryPoint}`} className="accident-item-card">
            <div className="accident-item-header">
              <div className="accident-title-wrap">
                <FaExclamationTriangle className="accident-title-icon" />
                <div>
                  <h3>{accident.label || 'Accident detected'}</h3>
                  <p>{accident.junction_name || 'Unknown Junction'} | {accident.lane_name || 'Unknown lane'}</p>
                </div>
              </div>
              <span className="accident-status">{accident.status || 'ACTIVE'}</span>
            </div>

            <div className="accident-item-grid">
              <div className="accident-live-frame">
                {liveFrame ? (
                  <img
                    src={liveFrame}
                    alt={`SUMO live frame for ${accident.junction_name || 'junction'}`}
                    style={{ transform: `scale(${focus.zoom})`, transformOrigin: `${focus.x}% ${focus.y}%` }}
                  />
                ) : (
                  <div className="accident-frame-placeholder">Live SUMO frame unavailable</div>
                )}
                {liveFrame && (
                  <div className="accident-frame-meta">
                    Last frame: {new Date(liveUpdatedAt).toLocaleTimeString()}
                  </div>
                )}
              </div>

              <div className="accident-details">
                <div className="accident-detail-row">
                  <FaClock />
                  <span>{accident.timestamp ? new Date(accident.timestamp).toLocaleString() : 'Unknown time'}</span>
                </div>
                <div className="accident-detail-row">
                  <FaRoad />
                  <span>Lane: {accident.lane_name || accident.roadId || 'Unknown lane'}</span>
                </div>
                <div className="accident-detail-row">
                  <FaMapMarkerAlt />
                  <span>Entry: {accident.entryPoint || 'N/A'} | Camera: {accident.camera || 'N/A'}</span>
                </div>
                <div className="accident-detail-callout">
                  Immediate action required at <strong>{accident.junction_name || 'Unknown Junction'}</strong>.
                </div>
              </div>
            </div>

            <div className="accident-item-actions">
              <button type="button" onClick={() => handleOpenJunction(accident.junction_id)}>
                Please proceed to monitor the junction
              </button>
              <button
                type="button"
                className="resolve-btn"
                onClick={() => handleResolveAccident(id)}
                disabled={!!pendingResolve[id]}
              >
                {pendingResolve[id] ? 'Updating...' : 'Subside the accident, it is controlled'}
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default Accidents;
