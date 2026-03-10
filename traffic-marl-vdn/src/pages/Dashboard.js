import React, { useState, useEffect } from 'react';
import '../styles/Dashboard.css';
import { JUNCTIONS, TRAFFIC_THRESHOLDS } from '../constants';
import { useWebSocket } from '../services/websocket';

// Components
import JunctionCard from '../components/dashboard/JunctionCard';
import QueueCard from '../components/dashboard/QueueCard';
import LiveSummary from '../components/dashboard/LiveSummary';

const Dashboard = () => {
  const { data, isConnected, sendMessage } = useWebSocket();
  const [junctionData, setJunctionData] = useState({});
  const [queueData, setQueueData] = useState({});
  const [networkMode, setNetworkMode] = useState('marl');
  const [isSwitchConfirmOpen, setIsSwitchConfirmOpen] = useState(false);
  const [requestedMode, setRequestedMode] = useState('');
  const [pendingValidationMode, setPendingValidationMode] = useState('');
  const [toast, setToast] = useState({ show: false, message: '' });
  const [summaryData, setSummaryData] = useState({
    accidents: 0,
    emergencyVehicles: 0,
    totalVehicles: 0,
    trafficLevel: 'low'
  });

  const LANE_EDGE_MAP = {
    J4: {
      west: ['-E0'],
      east: ['E0'],
      pedestrian: ['J4_c0', 'J4_c1'],
    },
    J1: {
      north: ['-E2'],
      east: ['E00'],
      west: ['-E3'],  
    },
    J8: {
      north: ['-E4'],
      east: ['-E5'],
      west: ['E3'],
      south: ['-E8'],
    },
  };

  const getModeLabel = (mode) => {
    if (mode === 'manual') return 'Police Officer';
    if (mode === 'fixed') return 'Fixed Time';
    if (mode === 'marl') return 'MARL Agent';
    return 'Mixed';
  };

  const MODE_LABEL = {
    marl: 'MARL Agent',
    manual: 'Police Officer',
    fixed: 'Fixed Time Controller'
  };

  const isNetworkModeLoading = !!pendingValidationMode;

  const validateSwitchIfPending = (serverMode) => {
    if (!pendingValidationMode) {
      return;
    }

    if (pendingValidationMode === serverMode) {
      setPendingValidationMode('');
      setToast({ show: true, message: `Environment switched to ${MODE_LABEL[serverMode] || serverMode}.` });
    }
  };

  const updateJunctionModes = (modes) => {
    setJunctionData(prev => {
      const next = { ...prev };
      Object.entries(modes || {}).forEach(([junctionId, mode]) => {
        next[junctionId] = {
          ...(next[junctionId] || {}),
          controlMode: mode
        };
      });
      return next;
    });
  };

  const queueToTrafficLevel = (queueValue) => {
    if (queueValue >= 70) return 'high';
    if (queueValue >= 35) return 'medium';
    return 'low';
  };

  const updateFromJunctionLive = (junctionLive, avgSpeed) => {
    if (!junctionLive || typeof junctionLive !== 'object') {
      return;
    }

    setJunctionData(prev => {
      const next = { ...prev };
      Object.entries(junctionLive).forEach(([junctionId, metrics]) => {
        const queue = Number(metrics?.vehicles_waiting || 0);
        const density = Number(metrics?.vehicle_density || 0);
        const wait = Number(metrics?.avg_wait_time || 0);
        const ped = Number(metrics?.pedestrians || 0);
        const emergency = Number(metrics?.emergency || 0);
        const accidents = Number(metrics?.accidents || 0);

        next[junctionId] = {
          ...(next[junctionId] || {}),
          vehiclesWaiting: Math.round(queue),
          vehicleDensity: Math.max(0, Math.min(1, density)),
          avgWaitTime: Number(wait.toFixed(1)),
          pedestrians: ped,
          emergencyVehicles: emergency,
          accidents,
          trafficLevel: queueToTrafficLevel(queue),
          avgSpeed: typeof avgSpeed === 'number' ? avgSpeed : (next[junctionId]?.avgSpeed || 0),
        };
      });
      return next;
    });

    setQueueData(prev => {
      const next = { ...prev };
      JUNCTIONS.forEach(j => {
        const metrics = junctionLive[j.id] || {};
        const laneCountsByEdge = metrics.lane_counts_by_edge && typeof metrics.lane_counts_by_edge === 'object'
          ? metrics.lane_counts_by_edge
          : {};
        const fallbackLaneCounts = Array.isArray(metrics.lane_counts) ? metrics.lane_counts : [];
        const edgeMap = LANE_EDGE_MAP[j.id] || {};

        const laneValues = j.lanes.map((laneId, idx) => {
          const edges = edgeMap[laneId] || [];
          if (edges.length) {
            const edgeSum = edges.reduce((sum, edgeId) => sum + Number(laneCountsByEdge[edgeId] || 0), 0);
            if (edgeSum > 0 || edges.some((edgeId) => Object.prototype.hasOwnProperty.call(laneCountsByEdge, edgeId))) {
              return Math.round(edgeSum);
            }
          }
          return Math.round(Number(fallbackLaneCounts[idx] || 0));
        });

        next[j.id] = {
          lanes: [...j.lanes],
          values: laneValues,
        };
      });
      return next;
    });

    const totalEmergency = Object.values(junctionLive).reduce(
      (acc, m) => acc + Number(m?.emergency || 0),
      0
    );

    const avgQueueAcrossJunctions = Object.values(junctionLive).length
      ? Object.values(junctionLive).reduce((acc, m) => acc + Number(m?.vehicles_waiting || 0), 0)
          / Object.values(junctionLive).length
      : 0;

    setSummaryData(prev => ({
      ...prev,
      emergencyVehicles: Math.round(totalEmergency),
      trafficLevel: queueToTrafficLevel(avgQueueAcrossJunctions),
      avgSpeed: typeof avgSpeed === 'number' ? avgSpeed : prev.avgSpeed,
    }));
  };

  const buildSignalByLane = (junctionId, action, stepMeta, lanes, junctionMetrics) => {
    const out = {};
    lanes.forEach(l => {
      out[l] = 'red';
    });

    // Prefer backend live state (same source used by JunctionControl).
    const signalState = junctionMetrics?.signal_state && typeof junctionMetrics.signal_state === 'object'
      ? junctionMetrics.signal_state
      : null;
    const laneEdgeMap = LANE_EDGE_MAP[junctionId] || {};
    if (signalState && Object.keys(signalState).length > 0) {
      lanes.forEach((laneId) => {
        const edges = laneEdgeMap[laneId] || [];
        if (!edges.length) {
          return;
        }
        const states = edges
          .map((edgeId) => String(signalState[edgeId] || '').toLowerCase())
          .filter(Boolean);
        if (!states.length) {
          return;
        }
        if (states.includes('green')) {
          out[laneId] = 'green';
        } else if (states.includes('yellow')) {
          out[laneId] = 'yellow';
        } else {
          out[laneId] = 'red';
        }
      });
      return out;
    }

    const isYellow = Number(stepMeta?.is_yellow || 0) > 0.5;
    const isPedGreen = Number(stepMeta?.is_ped_green || 0) > 0.5;

    if (isYellow) {
      lanes.forEach(l => {
        out[l] = 'yellow';
      });
      return out;
    }

    // J4 has one vehicle phase shared by opposite lanes and one pedestrian phase.
    if (junctionId === 'J4') {
      if (!isPedGreen) {
        if (out.west !== undefined) out.west = 'green';
        if (out.east !== undefined) out.east = 'green';
      }
      return out;
    }

    const actionLane = { 0: 'north', 2: 'east', 1: 'west',  3: 'south' }[Number(action)];
    if (actionLane && out[actionLane] !== undefined) {
      out[actionLane] = 'green';
    }
    return out;
  };

  const handleGlobalModeSwitch = (mode) => {
    setRequestedMode(mode);
    setIsSwitchConfirmOpen(true);
  };

  const confirmGlobalModeSwitch = () => {
    if (!requestedMode) {
      setIsSwitchConfirmOpen(false);
      return;
    }

    if (!isConnected) {
      setToast({ show: true, message: 'Cannot switch environment while backend is offline.' });
      setIsSwitchConfirmOpen(false);
      setRequestedMode('');
      return;
    }

    sendMessage({
      type: 'set_global_mode',
      mode: requestedMode
    });
    setPendingValidationMode(requestedMode);
    setIsSwitchConfirmOpen(false);
    setRequestedMode('');
  };

  const cancelGlobalModeSwitch = () => {
    setIsSwitchConfirmOpen(false);
    setRequestedMode('');
  };

  useEffect(() => {
    if (!isConnected) {
      return;
    }
    sendMessage({ type: 'get_runtime_state' });
  }, [isConnected, sendMessage]);

  useEffect(() => {
    if (data) {
      if (data.type === 'mode_update') {
        const modePayload = data.data || {};
        if (modePayload.global_mode) {
          setNetworkMode(modePayload.global_mode);
          validateSwitchIfPending(modePayload.global_mode);
        }
        if (modePayload.junction_modes) {
          updateJunctionModes(modePayload.junction_modes);
        }
      }

      if (data.type === 'traffic_update') {
        const packet = data.data || {};

        if (packet.modes) {
          updateJunctionModes(packet.modes);
        }

        if (packet.junction_live) {
          updateFromJunctionLive(packet.junction_live, packet.avg_speed);

          setQueueData(prev => {
            const next = { ...prev };
            JUNCTIONS.forEach(j => {
              const existing = next[j.id] || { lanes: [...j.lanes], values: Array(j.lanes.length).fill(0) };
              const action = packet.actions?.[j.id];
              const stepMeta = packet.step_meta?.[j.id] || {};
              const junctionMetrics = packet.junction_live?.[j.id] || {};
              next[j.id] = {
                ...existing,
                signalByLane: buildSignalByLane(j.id, action, stepMeta, j.lanes, junctionMetrics),
              };
            });
            return next;
          });
        }

        if (packet.accidents) {
          const totalAccidents = Number(packet.accidents.count || 0);
          const byJunction = packet.accidents.by_junction && typeof packet.accidents.by_junction === 'object'
            ? packet.accidents.by_junction
            : {};

          setSummaryData(prev => ({
            ...prev,
            accidents: Math.max(0, Math.round(totalAccidents)),
          }));

          setJunctionData(prev => {
            const next = { ...prev };
            Object.entries(byJunction).forEach(([junctionId, count]) => {
              next[junctionId] = {
                ...(next[junctionId] || {}),
                accidents: Number(count || 0),
              };
            });
            return next;
          });
        }

        if (typeof packet.vehicle_count === 'number' || typeof packet.avg_speed === 'number') {
          setSummaryData(prev => ({
            ...prev,
            totalVehicles: typeof packet.vehicle_count === 'number' ? packet.vehicle_count : prev.totalVehicles,
            avgSpeed: typeof packet.avg_speed === 'number' ? packet.avg_speed : prev.avgSpeed,
            reward: typeof packet.reward === 'number' ? packet.reward : prev.reward
          }));
        }
      }

      // Backward compatibility payloads
      if (data.agents) {
        setJunctionData(data.agents);
      }
      if (data.queueData) {
        setQueueData(data.queueData);
      }
      if (data.summary) {
        setSummaryData(data.summary);
      }
    }
  }, [data]);

  useEffect(() => {
    if (!toast.show) {
      return undefined;
    }
    const timeoutId = setTimeout(() => {
      setToast({ show: false, message: '' });
    }, 2600);
    return () => clearTimeout(timeoutId);
  }, [toast.show]);

  // Simulated data for demonstration (remove when connected to real data)
  useEffect(() => {
    if (!isConnected) {
      // Demo data
      const demoJunctionData = {
        'J1': {
          controlMode: 'marl',
          vehiclesWaiting: 32,
          vehicleDensity: 0.4,
          avgWaitTime: 28.7,
          pedestrians: 42,
          emergencyVehicles: 0,
          accidents: 0,
          trafficLevel: 'low'
        },
        'J4': {
          controlMode: 'marl',
          vehiclesWaiting: 78,
          vehicleDensity: 0.6,
          avgWaitTime: 42.3,
          pedestrians: 15,
          emergencyVehicles: 1,
          accidents: 0,
          trafficLevel: 'medium'
        },
        'J8': {
          controlMode: 'marl',
          vehiclesWaiting: 142,
          vehicleDensity: 0.8,
          avgWaitTime: 68.5,
          pedestrians: 24,
          emergencyVehicles: 2,
          accidents: 1,
          trafficLevel: 'high'
        }
      };
      
      const demoQueueData = {
        'J1': {
          lanes: ['west', 'north', 'east'],
          values: [6, 12, 8]
        },
        'J4': {
          lanes: ['west', 'east'],
          values: [4, 20]
        },
        'J8': {
          lanes: ['north', 'east', 'south', 'west'],
          values: [6, 12, 15, 8]
        }
      };
      
      setJunctionData(demoJunctionData);
      setQueueData(demoQueueData);
      setSummaryData({
        accidents: 1,
        emergencyVehicles: 3,
        totalVehicles: 252,
        trafficLevel: 'medium'
      });
    }
  }, [isConnected]);

  return (
    <div className="dashboard-page">
      {/* Current Traffic Density Section */}
      <div className="section-header">
        <h2 className="section-title">Current Traffic Density</h2>
        <div className="network-control-wrap">
          <span className="network-control-label">Network Control:</span>
          <div className="network-mode-switches">
            <button
              className={`network-mode-btn ${networkMode === 'marl' ? 'active marl' : ''}`}
              onClick={() => handleGlobalModeSwitch('marl')}
              type="button"
              disabled={isNetworkModeLoading}
            >
              {pendingValidationMode === 'marl' && <span className="inline-spinner tiny" aria-hidden="true" />}
              MARL
          </button>
            <button
              className={`network-mode-btn ${networkMode === 'manual' ? 'active manual' : ''}`}
              onClick={() => handleGlobalModeSwitch('manual')}
              type="button"
              disabled={isNetworkModeLoading}
            >
              {pendingValidationMode === 'manual' && <span className="inline-spinner tiny" aria-hidden="true" />}
              Police
            </button>
            <button
              className={`network-mode-btn ${networkMode === 'fixed' ? 'active fixed' : ''}`}
              onClick={() => handleGlobalModeSwitch('fixed')}
              type="button"
              disabled={isNetworkModeLoading}
            >
              {pendingValidationMode === 'fixed' && <span className="inline-spinner tiny" aria-hidden="true" />}
              Fixed
            </button>
          </div>
          <span className="network-mode-text">{getModeLabel(networkMode)}</span>
        </div>
      </div>

      {isSwitchConfirmOpen && (
        <div className="network-switch-modal-backdrop" role="dialog" aria-modal="true">
          <div className="network-switch-modal">
            <h4>Confirm Environment Switch</h4>
            <p>
              Switch whole network to <strong>{MODE_LABEL[requestedMode] || requestedMode}</strong>?
            </p>
            {requestedMode === 'manual' && (
              <p className="network-switch-modal-note">
                This will require multiple police officers ({JUNCTIONS.length}) to operate.
              </p>
            )}
            <div className="network-switch-modal-actions">
              <button className="network-btn-cancel" type="button" onClick={cancelGlobalModeSwitch}>
                Cancel
              </button>
              <button className="network-btn-confirm" type="button" onClick={confirmGlobalModeSwitch}>
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {toast.show && <div className="network-switch-toast">{toast.message}</div>}

      <div className="junctions-grid">
        {JUNCTIONS.map(junction => (
          <JunctionCard
            key={junction.id}
            junction={junction}
            data={junctionData[junction.id] || {}}
          />
        ))}
      </div>

      {/* Queue Lengths Section */}
      <div className="queue-cards">
        {JUNCTIONS.map(junction => (
          <QueueCard
            key={junction.id}
            junction={junction}
            queueData={queueData[junction.id]}
          />
        ))}
      </div>

      {/* Live Traffic Summary Section */}
      <div className="section-header" style={{ marginTop: '20px' }}>
        <h2 className="section-title">Live Traffic Summary</h2>
      </div>

      <LiveSummary summaryData={summaryData} />

      {/* Connection Status Indicator (small) */}
      <div style={{ 
        position: 'fixed', 
        bottom: '20px', 
        right: '20px',
        padding: '8px 16px',
        background: isConnected ? '#2ecc71' : '#e74c3c',
        color: 'white',
        borderRadius: '20px',
        fontSize: '12px',
        fontWeight: '600',
        boxShadow: '0 4px 10px rgba(0,0,0,0.2)',
        zIndex: 1000
      }}>
        {isConnected ? '● LIVE' : '○ OFFLINE'}
      </div>
    </div>
  );
};

export default Dashboard;