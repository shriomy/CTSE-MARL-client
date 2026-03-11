import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { 
  FaTrafficLight, 
  FaRoad, 
  FaChartLine,
  FaMapMarkedAlt,
  FaChevronDown
} from 'react-icons/fa';
import { Line, Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { useWebSocket } from '../services/websocket';
import '../styles/JunctionControl.css';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

// Junction configuration
const JUNCTION_CONFIG = {
  'J4': {
    id: 'J4',
    name: 'SLIIT Campus',
    location: 'Malabe',
    type: 'three_way',
    lanes: [
      { 
        id: 'west', 
        name: 'Malabe Road', 
        direction: 'West',
        signals: ['red', 'yellow', 'green'],
        currentSignal: 'red'
      },
      { 
        id: 'east', 
        name: 'New Kandy Road', 
        direction: 'East',
        signals: ['red', 'yellow', 'green'],
        currentSignal: 'green'
      },
      { 
        id: 'pedestrian', 
        name: 'Pedestrian Crossing', 
        direction: 'Crossing',
        signals: ['red', 'green'],
        currentSignal: 'red'
      }
    ],
    roadNames: {
      west: 'Malabe Road',
      east: 'New Kandy Road',
    }
  },
  'J1': {
    id: 'J1',
    name: 'Weliwita Junction',
    location: 'Kaduwela',
    type: 'pedestrian',
    lanes: [
      { 
        id: 'west', 
        name: 'New kandy Road', 
        direction: 'West',
        signals: ['red', 'yellow', 'green'],
        currentSignal: 'red'
      },
      { 
        id: 'north', 
        name: 'Weliwita Road', 
        direction: 'North',
        signals: ['red', 'yellow', 'green'],
        currentSignal: 'red'
      },
      { 
        id: 'east', 
        name: 'Kaduwela Road', 
        direction: 'East',
        signals: ['red', 'yellow', 'green'],
        currentSignal: 'yellow'
      },
    ],
    roadNames: {
      west: 'New Kandy Road',
      north: 'Weliwita Road',
      east: 'Kaduwela Road'
    }
  },
  'J8': {
    id: 'J8',
    name: 'Kaduwela Junction',
    location: 'Kaduwela',
    type: 'four_way',
    lanes: [
      { 
        id: 'north', 
        name: 'kaduwela Road', 
        direction: 'North',
        signals: ['red', 'yellow', 'green'],
        currentSignal: 'green'
      },
      { 
        id: 'east', 
        name: 'New Kandy Road', 
        direction: 'East',
        signals: ['red', 'yellow', 'green'],
        currentSignal: 'red'
      },
      { 
        id: 'south', 
        name: 'Awissawella Road', 
        direction: 'South',
        signals: ['red', 'yellow', 'green'],
        currentSignal: 'red'
      },
      { 
        id: 'west', 
        name: 'Malabe Road', 
        direction: 'West',
        signals: ['red', 'yellow', 'green'],
        currentSignal: 'red'
      }
    ],
    roadNames: {
      north: 'Kaduwela Road',
      east: 'New Kandy Road',
      south: 'Awissawella Road',
      west: 'Malabe Road'
    }
  }
};

const JUNCTION_MAP_FOCUS = {
  J1: { x: 30, y: 38, zoom: 5.2 },
  J4: { x: 0, y: 35, zoom: 8.0 },
  J8: { x: 80, y: 35, zoom: 4.5 }
}

const JunctionControl = () => {
  const { junctionId } = useParams();
  const navigate = useNavigate();
  const { data, isConnected, sendMessage, setFrameStreaming } = useWebSocket();
  
  const [controlMode, setControlMode] = useState('agent'); // 'agent', 'police', 'fixed'
  const [laneData, setLaneData] = useState({});
  const [activeGreenLane, setActiveGreenLane] = useState('north');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(18);
  const [isSwitchConfirmOpen, setIsSwitchConfirmOpen] = useState(false);
  const [requestedMode, setRequestedMode] = useState('');
  const [pendingValidationMode, setPendingValidationMode] = useState('');
  const [fixedTimingSeconds, setFixedTimingSeconds] = useState(40);
  const [pendingManualCommand, setPendingManualCommand] = useState('');
  const [toast, setToast] = useState({ show: false, message: '' });
  const [activeManualCommand, setActiveManualCommand] = useState('');
  const [liveFrame, setLiveFrame] = useState('');
  const [liveUpdatedAt, setLiveUpdatedAt] = useState(0);
  const lastFrameAtRef = useRef(0);
  const [mapError, setMapError] = useState(false);

  // Rolling history for live charts (max 30 data points)
  const HISTORY_MAX = 30;
  const [graphHistory, setGraphHistory] = useState({
    labels: [],
    queueByLane: {},
    speedByLane: {},
    waitByLane: {},
    pedestrians: [],
  });
  const graphTickRef = useRef(0);

  const MODE_TO_SERVER = {
    agent: 'marl',
    police: 'manual',
    fixed: 'fixed'
  };

  const SERVER_TO_MODE = {
    marl: 'agent',
    manual: 'police',
    fixed: 'fixed'
  };

  const laneToAction = {
    north: 0,
    east: 2,
    west: 1,
    south: 3
  };

  const actionToLane = {
    0: 'north',
    2: 'east',
    1: 'west',
    3: 'south'
  };

  const MODE_LABEL = {
    agent: 'MARL Agent',
    police: 'Police Officer',
    fixed: 'Fixed Time Controller'
  };

  const normalizeFixedTiming = (value) => {
    const parsed = Number(value);
    return [20, 40, 60].includes(parsed) ? parsed : 40;
  };

  const extractJunctionFixedTiming = (fixedState) => {
    if (!fixedState || typeof fixedState !== 'object') {
      return null;
    }
    const entry = fixedState[junctionId];
    if (!entry || typeof entry !== 'object') {
      return null;
    }
    const candidate = entry.vehicle_green_steps ?? entry.green_steps;
    return normalizeFixedTiming(candidate);
  };

  const LANE_EDGE_MAP = {
    J4: {
      west: ['-E0'],
      east: ['E0'],
      pedestrian: ['J4_c0', 'J4_c1'],
    },
    J1: {
      north: ['-E2'],
      east: ['-E3'],
      west: ['E00'],
    },
    J8: {
      north: ['-E4'],
      east: ['-E5'], 
      west: ['E3'],
      south: ['-E8'],
    },
  };

  const validateSwitchIfPending = (serverMode) => {
    if (!pendingValidationMode) {
      return;
    }
    if (MODE_TO_SERVER[pendingValidationMode] === serverMode) {
      setPendingValidationMode('');
      setToast({ show: true, message: `Environment switched to ${MODE_LABEL[pendingValidationMode]}.` });
    }
  };

  const commandMatchesAction = (commandId, actionValue) => {
    const actionNum = Number(actionValue);
    if (junctionId === 'J4') {
      if (commandId === 'vehicles') {
        return actionNum === 0 || actionNum === 2;
      }
      if (commandId === 'pedestrians') {
        return actionNum === 1 || actionNum === 3;
      }
      return false;
    }

    const targetAction = laneToAction[commandId];
    return targetAction !== undefined && Number(targetAction) === actionNum;
  };

  const hydrateLaneDataFromLive = (junctionMetrics, avgSpeed) => {
    if (!junctionMetrics || typeof junctionMetrics !== 'object') {
      return;
    }

    const laneCounts = Array.isArray(junctionMetrics.lane_counts) ? junctionMetrics.lane_counts : [];
    const laneCountsByEdge = junctionMetrics.lane_counts_by_edge && typeof junctionMetrics.lane_counts_by_edge === 'object'
      ? junctionMetrics.lane_counts_by_edge
      : {};
    const laneMetricsByLaneId = junctionMetrics.lane_metrics && typeof junctionMetrics.lane_metrics === 'object'
      ? junctionMetrics.lane_metrics
      : {};
    const signalState = junctionMetrics.signal_state && typeof junctionMetrics.signal_state === 'object'
      ? junctionMetrics.signal_state
      : {};
    const accidentsByEdge = junctionMetrics.accidents_by_edge && typeof junctionMetrics.accidents_by_edge === 'object'
      ? junctionMetrics.accidents_by_edge
      : {};
    const laneEdgeMap = LANE_EDGE_MAP[junctionId] || {};
    const pedestriansTotal = Number(junctionMetrics.pedestrians || 0);
    const pedestrianTypes = junctionMetrics.pedestrian_types && typeof junctionMetrics.pedestrian_types === 'object'
      ? junctionMetrics.pedestrian_types
      : {};
    const emergencyTotal = Number(junctionMetrics.emergency || 0);
    const avgWait = Number(junctionMetrics.avg_wait_time || 0);
    const pedestrianAvgWait = Number(junctionMetrics.pedestrian_avg_wait_time || 0);
    const pedestriansWaitingLive = Number(junctionMetrics.pedestrians_waiting || 0);
    const speed = Number(avgSpeed || 0);

    const signalForLane = (laneId) => {
      const edges = laneEdgeMap[laneId] || [];
      if (!edges.length) {
        return null;
      }

      const states = edges
        .map((edgeId) => String(signalState[edgeId] || '').toLowerCase())
        .filter(Boolean);

      if (!states.length) {
        return null;
      }
      if (states.includes('green')) {
        return 'green';
      }
      if (states.includes('yellow')) {
        return 'yellow';
      }
      return 'red';
    };

    const accidentsForLane = (laneId) => {
      const edges = laneEdgeMap[laneId] || [];
      return edges.reduce((sum, edgeId) => sum + Number(accidentsByEdge[edgeId] || 0), 0);
    };

    const queueForLane = (laneId, fallbackIndex) => {
      const edges = laneEdgeMap[laneId] || [];
      if (edges.length) {
        const edgeSum = edges.reduce((sum, edgeId) => sum + Number(laneCountsByEdge[edgeId] || 0), 0);
        if (edgeSum > 0 || edges.some((edgeId) => Object.prototype.hasOwnProperty.call(laneCountsByEdge, edgeId))) {
          return edgeSum;
        }
      }
      return Number(laneCounts[fallbackIndex] || 0);
    };

    const aggregateLaneMetric = (laneId) => {
      const edges = laneEdgeMap[laneId] || [];
      if (!edges.length) {
        return null;
      }

      let totalVehicles = 0;
      let stoppedVehicles = 0;
      let stoppedWaitSum = 0;
      let weightedSumAll = 0;
      let emergencyTotalLane = 0;
      let speedWeightedSum = 0;
      let matched = 0;

      Object.entries(laneMetricsByLaneId).forEach(([sumoLaneId, laneMetric]) => {
        const laneEdge = String(sumoLaneId || '').split('_')[0];
        if (!edges.includes(laneEdge)) {
          return;
        }
        matched += 1;

        const tv = Number(laneMetric?.total_vehicles || 0);
        const sv = Number(laneMetric?.stopped_vehicles || 0);
        const sws = Number(laneMetric?.stopped_wait_sum || 0);
        const wsa = Number(laneMetric?.weighted_sum_all || 0);
        const et = Number(laneMetric?.emergency_total || 0);
        const avs = Number(laneMetric?.avg_speed_hist || 0);

        totalVehicles += tv;
        stoppedVehicles += sv;
        stoppedWaitSum += sws;
        weightedSumAll += wsa;
        emergencyTotalLane += et;
        speedWeightedSum += avs * tv;
      });

      if (!matched) {
        return null;
      }

      const avgWaitStopped = stoppedVehicles > 0 ? (stoppedWaitSum / stoppedVehicles) : 0;
      const vehicleDensityLane = totalVehicles > 0 ? (weightedSumAll / totalVehicles) : 0;
      const avgSpeedHistLane = totalVehicles > 0 ? (speedWeightedSum / totalVehicles) : 0;

      return {
        total_vehicles: totalVehicles,
        stopped_vehicles: stoppedVehicles,
        avg_wait_stopped: avgWaitStopped,
        vehicle_density: vehicleDensityLane,
        avg_speed_hist: avgSpeedHistLane,
        emergency_total: emergencyTotalLane,
      };
    };

    setLaneData(prev => {
      const updated = { ...prev };
      const motorLanes = junction.lanes.filter(l => l.id !== 'pedestrian');

      motorLanes.forEach((lane, idx) => {
        const laneMetric = aggregateLaneMetric(lane.id) || {};
        const queue = queueForLane(lane.id, idx);
        const exactQueue = Number(laneMetric.total_vehicles);
        const exactStopped = Number(laneMetric.stopped_vehicles);
        const exactWait = Number(laneMetric.avg_wait_stopped);
        const exactDensity = Number(laneMetric.vehicle_density);
        const exactSpeed = Number(laneMetric.avg_speed_hist);
        const exactEmergency = Number(laneMetric.emergency_total);
        const density = Number.isFinite(exactDensity) ? exactDensity : Math.min(1, queue / 20);
        const laneSignal = signalForLane(lane.id);
        updated[lane.id] = {
          ...(updated[lane.id] || {}),
          queueLength: Math.round(Number.isFinite(exactQueue) ? exactQueue : queue),
          vehicleDensity: density,
          vehiclesWaiting: Math.round(Number.isFinite(exactStopped) ? exactStopped : queue),
          avgWaitTime: Number((Number.isFinite(exactWait) ? exactWait : avgWait).toFixed(1)),
          pedestriansWaiting: Math.round(pedestriansTotal / Math.max(1, motorLanes.length)),
          emergencyVehicles: Math.round(Number.isFinite(exactEmergency) ? exactEmergency : emergencyTotal),
          accidents: accidentsForLane(lane.id),
          avgSpeed: Number((Number.isFinite(exactSpeed) ? exactSpeed : speed).toFixed(1)),
          ...(laneSignal ? { currentSignal: laneSignal } : {}),
        };
      });

      if (junction.lanes.some(l => l.id === 'pedestrian')) {
        const pedEdgeQueue = queueForLane('pedestrian', motorLanes.length);
        const pedLaneMetric = laneMetricsByLaneId.pedestrian || {};
        const pedQueue = Math.round(Number.isFinite(Number(pedLaneMetric.total_vehicles))
          ? Number(pedLaneMetric.total_vehicles)
          : (pedEdgeQueue || pedestriansTotal));
        const pedSignal = signalForLane('pedestrian');
        updated.pedestrian = {
          ...(updated.pedestrian || {}),
          queueLength: pedQueue,
          pedestriansWaiting: Math.round(Number.isFinite(pedestriansWaitingLive) && pedestriansWaitingLive > 0
            ? pedestriansWaitingLive
            : pedQueue),
          avgWaitTime: Number((Number.isFinite(Number(pedLaneMetric.avg_wait_stopped))
            ? Number(pedLaneMetric.avg_wait_stopped)
            : (Number.isFinite(pedestrianAvgWait) ? pedestrianAvgWait : avgWait)).toFixed(1)),
          elderlyPedestrians: Number(pedestrianTypes.elderly || 0),
          mobilityAidedPedestrians: Number(pedestrianTypes.mobility_aided || 0),
          studentPedestrians: Number(pedestrianTypes.student || 0),
          adultPedestrians: Number(pedestrianTypes.adult || 0),
          accidents: accidentsForLane('pedestrian'),
          ...(pedSignal ? { currentSignal: pedSignal } : {}),
        };
      }

      return updated;
    });
  };
  
  // Get current junction config
  const junction = JUNCTION_CONFIG[junctionId] || JUNCTION_CONFIG['J4'];
  
  // List of all junctions for dropdown
  const junctionList = Object.values(JUNCTION_CONFIG);
  
  // Seed fallback lane stats (kept as baseline when backend does not provide lane-level stats).
  useEffect(() => {
    const mockLaneData = {
      west: {
        queueLength: 12,
        vehicleDensity: 0.6,
        vehiclesWaiting: 8,
        avgWaitTime: 45.2,
        pedestriansWaiting: 3,
        emergencyVehicles: 0,
        avgSpeed: 12.5,
        currentSignal: 'red',
        accidents: 0,
      },
      north: {
        queueLength: 4,
        vehicleDensity: 0.2,
        vehiclesWaiting: 3,
        avgWaitTime: 12.8,
        pedestriansWaiting: 5,
        emergencyVehicles: 1,
        avgSpeed: 28.7,
        currentSignal: 'green',
        accidents: 0,
      },
      east: {
        queueLength: 18,
        vehicleDensity: 0.8,
        vehiclesWaiting: 15,
        avgWaitTime: 68.5,
        pedestriansWaiting: 2,
        emergencyVehicles: 0,
        avgSpeed: 5.2,
        currentSignal: 'red',
        accidents: 0,
      },
      south: {
        queueLength: 9,
        vehicleDensity: 0.4,
        vehiclesWaiting: 7,
        avgWaitTime: 32.1,
        pedestriansWaiting: 4,
        emergencyVehicles: 0,
        avgSpeed: 18.3,
        currentSignal: 'red',
        accidents: 0,
      },
      pedestrian: {
        queueLength: 12,
        pedestriansWaiting: 12,
        avgWaitTime: 25.4,
        currentSignal: 'red',
        accidents: 0,
      }
    };
    
    setLaneData(mockLaneData);
    
    // Set active green lane based on junction type
    if (junctionId === 'J4') {
      setActiveGreenLane('east');
    } else if (junctionId === 'J1') {
      setActiveGreenLane('east');
    } else {
      setActiveGreenLane('north');
    }
  }, [junctionId]);

  useEffect(() => {
    if (!isConnected) {
      return;
    }
    sendMessage({ type: 'get_runtime_state' });
  }, [isConnected, junctionId, sendMessage]);

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

    if (data.type === 'mode_update' && data.data?.junction_modes) {
      const serverMode = data.data.junction_modes[junctionId];
      if (serverMode && SERVER_TO_MODE[serverMode]) {
        setControlMode(SERVER_TO_MODE[serverMode]);
        validateSwitchIfPending(serverMode);
      }
      const runtimeFixed = extractJunctionFixedTiming(data.data?.fixed_state);
      if (runtimeFixed) {
        setFixedTimingSeconds(runtimeFixed);
      }
    }

    if (data.type === 'traffic_update' && data.data?.actions) {
      if (data.data?.modes) {
        const modeForJunction = data.data.modes[junctionId];
        if (modeForJunction && SERVER_TO_MODE[modeForJunction]) {
          setControlMode(SERVER_TO_MODE[modeForJunction]);
          validateSwitchIfPending(modeForJunction);
        }
      }

      if (data.data?.junction_live?.[junctionId]) {
        hydrateLaneDataFromLive(data.data.junction_live[junctionId], data.data.avg_speed);
      }

      const frame = data.data?.sumo_live_frame;
      if (typeof frame === 'string' && frame.startsWith('data:image/')) {
        const now = Date.now();
        if (now - lastFrameAtRef.current < 500) {
          return;
        }
        setLiveFrame(frame);
        setLiveUpdatedAt(now);
        lastFrameAtRef.current = now;
        setMapError(false);
      }

      const action = data.data.actions[junctionId];
      if (junctionId === 'J4') {
        const isPedestrianCommand = Number(action) === 1 || Number(action) === 3;
        setActiveManualCommand(isPedestrianCommand ? 'pedestrians' : 'vehicles');
        setActiveGreenLane(isPedestrianCommand ? 'pedestrian' : 'east');
      } else {
        const lane = actionToLane[action];
        if (lane) {
          setActiveManualCommand(lane);
          setActiveGreenLane(lane);
        }
      }

      if (pendingManualCommand && commandMatchesAction(pendingManualCommand, action)) {
        setPendingManualCommand('');
        const label = pendingManualCommand === 'vehicles'
          ? 'Vehicles'
          : pendingManualCommand === 'pedestrians'
            ? 'Pedestrians'
            : (junction.lanes.find((l) => l.id === pendingManualCommand)?.name || pendingManualCommand);
        setToast({ show: true, message: `GREEN command applied: ${label}.` });
      }
    }
  }, [data, junctionId, pendingValidationMode, pendingManualCommand]);

  // Push new live data into rolling graph history whenever laneData changes
  useEffect(() => {
    const motorLanes = (JUNCTION_CONFIG[junctionId] || JUNCTION_CONFIG['J4'])
      .lanes.filter(l => l.id !== 'pedestrian');
    if (!motorLanes.length) return;

    const tick = ++graphTickRef.current;
    const label = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    setGraphHistory(prev => {
      const labels = [...prev.labels, label].slice(-HISTORY_MAX);

      const queueByLane = { ...prev.queueByLane };
      const speedByLane = { ...prev.speedByLane };
      const waitByLane  = { ...prev.waitByLane };

      motorLanes.forEach(lane => {
        const d = laneData[lane.id] || {};
        queueByLane[lane.id] = [...(queueByLane[lane.id] || []), Number(d.queueLength || 0)].slice(-HISTORY_MAX);
        speedByLane[lane.id] = [...(speedByLane[lane.id] || []), Number(d.avgSpeed || 0)].slice(-HISTORY_MAX);
        waitByLane[lane.id]  = [...(waitByLane[lane.id]  || []), Number(d.avgWaitTime || 0)].slice(-HISTORY_MAX);
      });

      const pedD = laneData['pedestrian'] || {};
      const pedestrians = [...prev.pedestrians, Number(pedD.pedestriansWaiting || 0)].slice(-HISTORY_MAX);

      return { labels, queueByLane, speedByLane, waitByLane, pedestrians };
    });
  }, [laneData]);

  useEffect(() => {
    setTimeRemaining(18);
  }, [activeGreenLane]);

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeRemaining((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!toast.show) {
      return undefined;
    }
    const timeoutId = setTimeout(() => {
      setToast({ show: false, message: '' });
    }, 2600);
    return () => clearTimeout(timeoutId);
  }, [toast.show]);
  
  const handleModeSwitch = (mode) => {
    setRequestedMode(mode);
    setIsSwitchConfirmOpen(true);
  };

  const confirmModeSwitch = () => {
    if (!requestedMode) {
      setIsSwitchConfirmOpen(false);
      return;
    }

    if (isConnected) {
      sendMessage({
        type: 'set_junction_mode',
        junction_id: junctionId,
        mode: MODE_TO_SERVER[requestedMode] || 'marl'
      });
      if (requestedMode === 'fixed') {
        sendMessage({
          type: 'set_fixed_timing',
          junction_id: junctionId,
          green_steps: fixedTimingSeconds
        });
      }
      setPendingValidationMode(requestedMode);
    } else {
      setToast({ show: true, message: 'Cannot switch environment while backend is offline.' });
    }

    setIsSwitchConfirmOpen(false);
    setRequestedMode('');
  };

  const cancelModeSwitch = () => {
    setIsSwitchConfirmOpen(false);
    setRequestedMode('');
  };

  const handleJunctionFixedTimingChange = (event) => {
    const seconds = normalizeFixedTiming(event.target.value);
    setFixedTimingSeconds(seconds);

    if (!isConnected) {
      return;
    }

    sendMessage({
      type: 'set_fixed_timing',
      junction_id: junctionId,
      green_steps: seconds
    });
    setToast({ show: true, message: `Fixed vehicle timing set to ${seconds}s (pedestrians remain 15s).` });
  };

  const handlePoliceLaneClick = (commandId, action, activeLaneHint) => {
    if (action === undefined) {
      return;
    }

    if (!isConnected) {
      setToast({ show: true, message: 'Cannot send green command while backend is offline.' });
      return;
    }

    setPendingManualCommand(commandId);
    setActiveManualCommand(commandId);
    if (activeLaneHint) {
      setActiveGreenLane(activeLaneHint);
    }

    sendMessage({
      type: 'set_manual_action',
      junction_id: junctionId,
      action
    });
    sendMessage({
      type: 'set_junction_mode',
      junction_id: junctionId,
      mode: 'manual'
    });
  };
  
  const handleJunctionChange = (newJunctionId) => {
    navigate(`/junction-control/${newJunctionId}`);
    setIsDropdownOpen(false);
  };
  
  const getControlBadge = () => {
    switch(controlMode) {
      case 'agent': return { text: 'MARL Agent', class: 'badge-agent' };
      case 'police': return { text: 'Police Officer', class: 'badge-police' };
      case 'fixed': return { text: 'Fixed Time Controller', class: 'badge-fixed' };
      default: return { text: 'Unknown', class: '' };
    }
  };
  
  const getActiveGreenLaneName = () => {
    const lane = junction.lanes.find(l => l.id === activeGreenLane);
    return lane ? lane.name : 'Unknown';
  };

  const policeSelectableLanes = junction.lanes.filter(
    lane => lane.id !== 'pedestrian' && laneToAction[lane.id] !== undefined
  );

  const manualCommandOptions = junctionId === 'J4'
    ? [
        {
          id: 'vehicles',
          label: 'Vehicles',
          subtitle: 'Malabe Road + New Kandy Road',
          action: 0,
          activeLaneHint: 'east',
        },
        {
          id: 'pedestrians',
          label: 'Pedestrians',
          subtitle: 'North + South crossings',
          action: 1,
          activeLaneHint: 'pedestrian',
        },
      ]
    : policeSelectableLanes.map((lane) => ({
        id: lane.id,
        label: lane.name,
        subtitle: lane.direction,
        action: laneToAction[lane.id],
        activeLaneHint: lane.id,
      }));

  const fallbackMapByJunction = {
    J1: '/Weliwita.png',
    J4: '/Sliit.png',
    J8: '/Kaduwela.png'
  };

  const mapFocus = JUNCTION_MAP_FOCUS[junctionId] || { x: 50, y: 50, zoom: 1.6 };
  const isModeSwitchLoading = !!pendingValidationMode;
  const isManualCommandLoading = !!pendingManualCommand;
  const showLiveFeed = isConnected && !!liveFrame;
  const mapSource = showLiveFeed ? liveFrame : (fallbackMapByJunction[junctionId] || '/Map.png');
  const mapTransform = showLiveFeed ? `scale(${mapFocus.zoom})` : 'scale(1)';
  const mapTransformOrigin = `${mapFocus.x}% ${mapFocus.y}%`;

  const LANE_COLORS = {
    west:  { border: '#FF6B6B', bg: 'rgba(255,107,107,0.15)' },
    north: { border: '#4ECDC4', bg: 'rgba(78,205,196,0.15)' },
    east:  { border: '#FFD166', bg: 'rgba(255,209,102,0.15)' },
    south: { border: '#06D6A0', bg: 'rgba(6,214,160,0.15)' },
  };

  const motorLanes = junction.lanes.filter(l => l.id !== 'pedestrian');
  const hasPedestrian = junction.lanes.some(l => l.id === 'pedestrian');

  const lineChartBase = {
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 300 },
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: { position: 'bottom', labels: { usePointStyle: true, pointStyle: 'circle', padding: 16, color: '#64748b', font: { size: 11 } } },
      tooltip: { backgroundColor: 'rgba(15,23,42,0.9)', titleColor: '#f8fafc', bodyColor: '#cbd5e1', padding: 10, cornerRadius: 8 }
    },
    scales: {
      x: { grid: { color: 'rgba(0,0,0,0.04)' }, ticks: { color: '#94a3b8', font: { size: 10 }, maxTicksLimit: 6 } },
      y: { grid: { color: 'rgba(0,0,0,0.06)' }, ticks: { color: '#94a3b8', font: { size: 10 } }, beginAtZero: true }
    }
  };

  const queueChartData = {
    labels: graphHistory.labels,
    datasets: motorLanes.map(lane => ({
      label: lane.name,
      data: graphHistory.queueByLane[lane.id] || [],
      borderColor: (LANE_COLORS[lane.id] || {}).border || '#888',
      backgroundColor: (LANE_COLORS[lane.id] || {}).bg || 'rgba(136,136,136,0.1)',
      fill: true,
      tension: 0.4,
      pointRadius: 2,
      borderWidth: 2,
    }))
  };

  const speedChartData = {
    labels: graphHistory.labels,
    datasets: motorLanes.map(lane => ({
      label: lane.name,
      data: graphHistory.speedByLane[lane.id] || [],
      borderColor: (LANE_COLORS[lane.id] || {}).border || '#888',
      backgroundColor: (LANE_COLORS[lane.id] || {}).bg || 'rgba(136,136,136,0.1)',
      fill: false,
      tension: 0.4,
      pointRadius: 2,
      borderWidth: 2,
    }))
  };

  const waitChartData = {
    labels: graphHistory.labels,
    datasets: motorLanes.map(lane => ({
      label: lane.name,
      data: graphHistory.waitByLane[lane.id] || [],
      borderColor: (LANE_COLORS[lane.id] || {}).border || '#888',
      backgroundColor: (LANE_COLORS[lane.id] || {}).bg || 'rgba(136,136,136,0.1)',
      fill: false,
      tension: 0.4,
      pointRadius: 2,
      borderWidth: 2,
    }))
  };

  const pedChartData = {
    labels: graphHistory.labels,
    datasets: [{
      label: 'Pedestrians Waiting',
      data: graphHistory.pedestrians,
      backgroundColor: 'rgba(155,89,182,0.7)',
      borderColor: '#9b59b6',
      borderWidth: 1.5,
      borderRadius: 4,
    }]
  };

  const waitChartOptions = { ...lineChartBase, scales: { ...lineChartBase.scales, y: { ...lineChartBase.scales.y, title: { display: true, text: 'seconds', color: '#94a3b8', font: { size: 10 } } } } };
  const speedChartOptions = { ...lineChartBase, scales: { ...lineChartBase.scales, y: { ...lineChartBase.scales.y, title: { display: true, text: 'km/h', color: '#94a3b8', font: { size: 10 } } } } };
  const barChartOptions = {
    ...lineChartBase,
    scales: { ...lineChartBase.scales, y: { ...lineChartBase.scales.y, title: { display: true, text: 'count', color: '#94a3b8', font: { size: 10 } } } }
  };

  return (
    <div className="junction-control-page">
      {/* Header with dropdown selector */}
      <div className="control-header">
        <div className="junction-selector">
          <div 
            className="selected-junction"
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          >
            <FaTrafficLight className="selector-icon" />
            <div className="selector-text">
              <span className="current-label">Current Junction:</span>
              <span className="current-name">{junction.name}</span>
            </div>
            <FaChevronDown className={`dropdown-arrow ${isDropdownOpen ? 'open' : ''}`} />
          </div>
          
          {isDropdownOpen && (
            <div className="dropdown-menu">
              {junctionList.map(j => (
                <div 
                  key={j.id}
                  className={`dropdown-item ${j.id === junctionId ? 'active' : ''}`}
                  onClick={() => handleJunctionChange(j.id)}
                >
                  <span className="item-name">{j.name}</span>
                  <span className="item-location">{j.location}</span>
                  {j.id === junctionId && <span className="item-check">✓</span>}
                </div>
              ))}
            </div>
          )}
        </div>
        
        <div className="header-status">
          <span className={`connection-dot ${isConnected ? 'connected' : 'disconnected'}`}></span>
          {isConnected ? 'Live' : 'Offline'}
        </div>
      </div>
      
      {/* Main content - 3 sections */}
      <div className="control-content">
        
        {/* SECTION 1: Junction Live Control Panel */}
        <div className="live-control-section">
          <h2 className="section-title">
            <FaTrafficLight /> Junction Live View
          </h2>
          
          <div className="live-control-row">
            {/* Left - SUMO Map (placeholder) */}
            <div className="map-container">
              <div className="junction-map-frame">
                <img
                  src={mapSource}
                  alt={showLiveFeed ? `Live SUMO View - ${junction.name}` : `${junction.name} Junction Map`}
                  className="junction-map"
                  style={{ transform: mapTransform, transformOrigin: mapTransformOrigin }}
                  onError={() => setMapError(true)}
                />

                {showLiveFeed && (
                  <div className="junction-live-badge">
                    LIVE VIEW
                    <span className="junction-live-dot" />
                  </div>
                )}
              </div>

              {mapError && (
                <div className="map-placeholder">
                  <FaMapMarkedAlt className="map-icon" />
                  <p>SUMO Simulation View</p>
                  <small>Live frame unavailable for {junction.name}</small>
                  <div className="map-coordinates">
                    <span>Lat: 6.9271° N</span>
                    <span>Lng: 79.9612° E</span>
                  </div>
                </div>
              )}
            </div>
            
            {/* Right - Control Panel */}
            <div className="control-panel">
              <div className="panel-header">
                <h3>{junction.name}</h3>
                <p className="junction-location">{junction.location}</p>
              </div>
              
              <div className="control-mode-info">
                <span className="control-label">Controlled by:</span>
                <span className={`control-badge ${getControlBadge().class}`}>
                  {getControlBadge().text}
                </span>
              </div>
              
              <div className="mode-switches">
                <button 
                  className={`mode-switch police ${controlMode === 'police' ? 'active' : ''}`}
                  onClick={() => handleModeSwitch('police')}
                  type="button"
                  disabled={isModeSwitchLoading}
                >
                  <span className="switch-icon">👮</span>
                  {pendingValidationMode === 'police' && <span className="inline-spinner" aria-hidden="true" />}
                  <span className="switch-text">Switch to Police Officer Mode</span>
                </button>
                
                <button 
                  className={`mode-switch agent ${controlMode === 'agent' ? 'active' : ''}`}
                  onClick={() => handleModeSwitch('agent')}
                  type="button"
                  disabled={isModeSwitchLoading}
                >
                  <span className="switch-icon">🤖</span>
                  {pendingValidationMode === 'agent' && <span className="inline-spinner" aria-hidden="true" />}
                  <span className="switch-text">Switch to MARL Agent</span>
                </button>
                
                <button 
                  className={`mode-switch fixed ${controlMode === 'fixed' ? 'active' : ''}`}
                  onClick={() => handleModeSwitch('fixed')}
                  type="button"
                  disabled={isModeSwitchLoading}
                >
                  <span className="switch-icon">⏱️</span>
                  {pendingValidationMode === 'fixed' && <span className="inline-spinner" aria-hidden="true" />}
                  <span className="switch-text">Switch to Fixed Time Control</span>
                  <span className="mode-fixed-inline" onClick={(e) => e.stopPropagation()}>
                    <select
                      className="mode-fixed-select"
                      value={fixedTimingSeconds}
                      onChange={handleJunctionFixedTimingChange}
                      onClick={(e) => e.stopPropagation()}
                      onMouseDown={(e) => e.stopPropagation()}
                      disabled={!isConnected}
                      aria-label="Junction fixed vehicle timing"
                    >
                      <option value={60}>60s</option>
                      <option value={40}>40s</option>
                      <option value={20}>20s</option>
                    </select>
                    <span className="mode-fixed-note">Ped: 15s</span>
                  </span>
                </button>
              </div>

              <div className="current-state-info">
                <h3>Current state information:</h3>
                <div className="current-state-line">
                  <span>{getActiveGreenLaneName()}</span>
                  <span> - </span>
                  <span className="state-green">GREEN</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {showLiveFeed && (
          <div className="junction-live-meta">
            Last frame: {new Date(liveUpdatedAt).toLocaleTimeString()}
          </div>
        )}

        {controlMode === 'police' && (
          <div className="police-lane-command-section">
            <h2 className="section-title">
              <FaRoad /> Police Green Commands
            </h2>
            <div className="command-hint">
              <span className="green-command-cursor" aria-hidden="true">➤</span>
              Click a command to give GREEN signal at this junction.
            </div>
            <div className="police-lane-command-grid">
              {manualCommandOptions.map((option) => (
                <button
                  key={option.id}
                  className={`police-lane-command-btn ${option.id === activeManualCommand ? 'active' : ''}`}
                  onClick={() => handlePoliceLaneClick(option.id, option.action, option.activeLaneHint)}
                  type="button"
                  disabled={isManualCommandLoading}
                >
                  <span className="lane-command-name">{option.label}</span>
                  {pendingManualCommand === option.id && <span className="inline-spinner dark" aria-hidden="true" />}
                  {option.id === activeManualCommand && <span className="lane-green-indicator">GREEN</span>}
                </button>
              ))}
            </div>
          </div>
        )}
        
        {/* SECTION 2: Lane Specifics */}
        <div className="lane-specifics-section">
          <h2 className="section-title">
            <FaRoad /> Lane Specifics
          </h2>
          
          <div className="lane-grid">
            {junction.lanes.map(lane => {
              const data = laneData[lane.id] || {};
              const isPedestrian = lane.id === 'pedestrian';
              
              return (
                <div key={lane.id} className={`lane-card ${lane.id}`}>
                  <div className="lane-header">
                    <h4>{lane.name}</h4>
                    <div className="signal-indicators">
                      {lane.signals.map(signal => (
                        <div 
                          key={signal}
                          className={`signal-beam ${signal} ${data.currentSignal === signal ? 'active' : ''}`}
                          title={`${signal.toUpperCase()} signal`}
                        />
                      ))}
                    </div>
                  </div>
                  
                  <div className="lane-stats">
                    {!isPedestrian && (
                      <>
                        <div className="stat-row">
                          <div className="stat-item">
                            <span className="stat-label">Queue Length</span>
                            <span className="stat-value">{data.queueLength || 0}</span>
                          </div>
                          <div className="stat-item">
                            <span className="stat-label">Vehicle Density</span>
                            <span className="stat-value">{((data.vehicleDensity || 0) * 100).toFixed(0)}%</span>
                          </div>
                        </div>
                        
                        <div className="stat-row">
                          <div className="stat-item">
                            <span className="stat-label">Vehicles Waiting</span>
                            <span className="stat-value">{data.vehiclesWaiting || 0}</span>
                          </div>
                          <div className="stat-item">
                            <span className="stat-label">Avg Wait Time</span>
                            <span className="stat-value">{data.avgWaitTime || 0}s</span>
                          </div>
                        </div>
                        
                        <div className="stat-row">
                          <div className="stat-item">
                            <span className="stat-label">Pedestrians</span>
                            <span className="stat-value">{data.pedestriansWaiting || 0}</span>
                          </div>
                          <div className="stat-item">
                            <span className="stat-label">Emergency Vehicles</span>
                            <span className="stat-value emergency">{data.emergencyVehicles || 0}</span>
                          </div>
                        </div>
                        
                        <div className="stat-row">
                          <div className="stat-item">
                            <span className="stat-label">Avg Speed</span>
                            <span className="stat-value">{data.avgSpeed || 0} km/h</span>
                          </div>
                          <div className="stat-item">
                            <span className="stat-label">Accidents</span>
                            <span className="stat-value emergency">
                              {data.accidents || 0}
                            </span>
                          </div>
                        </div>
                      </>
                    )}
                    
                    {isPedestrian && (
                      <>
                        <div className="stat-row">
                          <div className="stat-item">
                            <span className="stat-label">Pedestrians Waiting</span>
                            <span className="stat-value">{data.pedestriansWaiting || 0}</span>
                          </div>
                          <div className="stat-item">
                            <span className="stat-label">Avg Wait Time</span>
                            <span className="stat-value">{data.avgWaitTime || 0}s</span>
                          </div>
                        </div>
                        
                        <div className="stat-row">
                          <div className="stat-item">
                            <span className="stat-label">Elderly Pedestrians</span>
                            <span className="stat-value">{data.elderlyPedestrians || 0}</span>
                          </div>
                          <div className="stat-item">
                            <span className="stat-label">Mobility-aided Pedestrians</span>
                            <span className="stat-value">{data.mobilityAidedPedestrians || 0}</span>
                          </div>
                        </div>

                        <div className="stat-row">
                          <div className="stat-item">
                            <span className="stat-label">Student Pedestrians</span>
                            <span className="stat-value">{data.studentPedestrians || 0}</span>
                          </div>
                          <div className="stat-item">
                            <span className="stat-label">Adult Pedestrians</span>
                            <span className="stat-value">{data.adultPedestrians || 0}</span>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        
        {/* SECTION 3: Junction Analytics – Live Graphs */}
        <div className="junction-analytics-section">
          <h2 className="section-title">
            <FaChartLine /> Junction Analytics
            <span className="analytics-live-badge">
              <span className="analytics-live-dot" />
              LIVE
            </span>
          </h2>

          <div className="analytics-graphs-grid">
            {/* Queue Length */}
            <div className="live-graph-card">
              <div className="live-graph-header">
                <span className="live-graph-title">Queue Length per Lane</span>
                <span className="live-graph-unit">vehicles</span>
              </div>
              <div className="live-graph-body">
                <Line data={queueChartData} options={lineChartBase} />
              </div>
            </div>

            {/* Avg Speed */}
            <div className="live-graph-card">
              <div className="live-graph-header">
                <span className="live-graph-title">Average Speed per Lane</span>
                <span className="live-graph-unit">km/h</span>
              </div>
              <div className="live-graph-body">
                <Line data={speedChartData} options={speedChartOptions} />
              </div>
            </div>

            {/* Avg Wait Time */}
            <div className="live-graph-card">
              <div className="live-graph-header">
                <span className="live-graph-title">Average Wait Time per Lane</span>
                <span className="live-graph-unit">seconds</span>
              </div>
              <div className="live-graph-body">
                <Line data={waitChartData} options={waitChartOptions} />
              </div>
            </div>

            {/* Pedestrians (only if junction has ped lane) */}
            {hasPedestrian && (
              <div className="live-graph-card">
                <div className="live-graph-header">
                  <span className="live-graph-title">Pedestrians Waiting</span>
                  <span className="live-graph-unit">people</span>
                </div>
                <div className="live-graph-body">
                  <Bar data={pedChartData} options={barChartOptions} />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {isSwitchConfirmOpen && (
        <div className="switch-modal-backdrop" onClick={cancelModeSwitch}>
          <div className="switch-modal" onClick={(e) => e.stopPropagation()}>
            <h4>Confirm Environment Switch</h4>
            <p>Switch this junction to <strong>{MODE_LABEL[requestedMode] || 'selected mode'}</strong>?</p>
            <div className="switch-modal-actions">
              <button type="button" className="btn-cancel" onClick={cancelModeSwitch}>Cancel</button>
              <button type="button" className="btn-confirm" onClick={confirmModeSwitch}>Confirm</button>
            </div>
          </div>
        </div>
      )}

      {toast.show && <div className="switch-toast">{toast.message}</div>}
    </div>
  );
};

export default JunctionControl;