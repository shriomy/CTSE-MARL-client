import React from 'react';

const LANE_NAME_BY_JUNCTION = {
  J4: {
    west: 'Malabe Road',
    east: 'New Kandy Road',
  },
  J1: {
    north: 'Weliwita Road',
    east: 'kaduwela Road',
    west: 'New Kandy Road',
  },
  J8: {
    north: 'Kaduwela Road',
    east: 'New Kandy Road',
    west: 'Malabe Road',
    south: 'Awissawella Road',
  },
};

const DIRECTION_LABEL = {
  north: 'North',
  east: 'East', 
  west: 'West',
  south: 'South',
};

const QueueCard = ({ junction, queueData }) => {
  const lanes = junction.lanes || [];
  const sourceLanes = Array.isArray(queueData?.lanes) ? queueData.lanes : lanes;
  const sourceValues = Array.isArray(queueData?.values) ? queueData.values : [];
  const signalByLane = queueData?.signalByLane || {};

  const laneValueMap = {};
  sourceLanes.forEach((laneId, idx) => {
    laneValueMap[String(laneId)] = Number(sourceValues[idx] || 0);
  });

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
          const value = Number(laneValueMap[String(lane)] || 0);
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