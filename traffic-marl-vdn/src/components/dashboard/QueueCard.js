import React from 'react';

const LANE_NAME_BY_JUNCTION = {
  J4: {
    west: 'Malabe Road',
    east: 'New Kandy Road',
  },
  J1: {
    west: 'New Kandy Road',
    north: 'Weliwita Road',
    east: 'kaduwela Road',
  },
  J8: {
    north: 'Kaduwela Road',
    east: 'New Kandy Road',
    south: 'Awissawella Road',
    west: 'Malabe Road',
  },
};

const DIRECTION_LABEL = {
  north: 'North',
  east: 'East',
  south: 'South',
  west: 'West',
};

const QueueCard = ({ junction, queueData }) => {
  const lanes = junction.lanes || [];
  const values = queueData?.values || lanes.map(() => Math.floor(Math.random() * 20));
  const signalByLane = queueData?.signalByLane || {};

  const getLaneDisplayName = (lane) => {
    const laneKey = String(lane || '').toLowerCase();
    const roadName = LANE_NAME_BY_JUNCTION[junction.id]?.[laneKey] || laneKey.toUpperCase();
    const direction = DIRECTION_LABEL[laneKey] || laneKey.toUpperCase();
    return `${roadName} (${direction})`;
  };
  
  const getQueueColor = (value) => {
    if (value > 15) return 'high';
    if (value > 10) return 'medium';
    return 'low';
  };

  return (
    <div className="queue-card">
      <div className="queue-header">
        <h3 className="queue-title">Queue lengths</h3>
        <div className="lane-chips">
          {junction.chips?.map((chip, index) => (
            <div 
              key={index} 
              className={`lane-chip signal-${signalByLane[junction.lanes[index]] || 'red'}`}
              title={`${getLaneDisplayName(junction.lanes[index])} signal: ${(signalByLane[junction.lanes[index]] || 'red').toUpperCase()}`}
            >
              {chip}
            </div>
          ))}
        </div>
      </div>

      <div className="queue-body">
        {lanes.map((lane, index) => {
          const value = values[index] || 0;
          const percentage = Math.min((value / 20) * 100, 100);
          const colorClass = getQueueColor(value);
          
          return (
            <div key={lane} className="queue-item">
              <div className="queue-item-header">
                <span className="queue-lane">{getLaneDisplayName(lane)}</span>
                <span className="queue-count">{value}</span>
              </div>
              <div className="queue-bar-container">
                <div 
                  className={`queue-bar ${colorClass}`}
                  style={{ width: `${percentage}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default QueueCard;