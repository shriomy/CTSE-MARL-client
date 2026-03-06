// Junction configurations
export const JUNCTIONS = [
  {
    id: 'J4',
    name: 'SLIIT Junction',
    location: 'Malabe',
    type: 'pedestrian',
    lanes: ['west', 'east'],
    chips: ['W', 'E']
  },
  {
    id: 'J1',
    name: 'Weliwita Junction',
    location: 'Kaduwela',
    type: 'three_way',
    lanes: ['west', 'north', 'east'], // E00, -E2, -E3 directions
    chips: ['W', 'N', 'E']
  }, 
  {
    id: 'J8',
    name: 'Kaduwela Junction',
    location: 'Kaduwela',
    type: 'four_way',
    lanes: ['north', 'east', 'south', 'west'],
    chips: ['N', 'E', 'S', 'W']
  }
];

// Control modes
export const CONTROL_MODES = {
  MARL: 'marl',
  MANUAL: 'manual',
  FIXED: 'fixed'
};

// Vehicle types with priorities
export const VEHICLE_PRIORITIES = {
  // Emergency vehicles (highest)
  police: 5.0,
  ambulance: 5.0,
  firetruck: 5.0,
  
  // Public transport
  bus: 3.0,
  
  // Heavy vehicles
  truck: 2.5,
  lorry: 2.5,
  
  // Standard vehicles
  real_car: 1.0,
  car: 1.0,
  
  // Light vehicles
  auto: 0.8,
  bike: 0.7,
  
  // Pedestrians
  adult: 1.0,
  student: 1.0,
  elder: 1.5,
  mobility_aid: 2.0
};

// Action names and colors
export const ACTION_CONFIG = {
  0: { name: 'WEST', color: '#FF6B6B' },
  1: { name: 'NORTH', color: '#4ECDC4' },
  2: { name: 'EAST', color: '#FFD166' },
  3: { name: 'SOUTH', color: '#06D6A0' },
  4: { name: 'EXTEND', color: '#118AB2' }
};

// Traffic status thresholds
export const TRAFFIC_THRESHOLDS = {
  low: 0.3,
  medium: 0.6,
  high: 0.9
};

// WebSocket configuration
export const WS_CONFIG = {
  url: 'ws://localhost:8765',
  reconnectInterval: 3000,
  maxReconnectAttempts: 10
};