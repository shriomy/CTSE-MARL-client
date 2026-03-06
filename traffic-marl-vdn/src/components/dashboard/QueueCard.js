import React from 'react';

const QueueCard = ({ junction, queueData }) => {
  const lanes = junction.lanes || [];
  const values = queueData?.values || lanes.map(() => Math.floor(Math.random() * 20));
  
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
              className={`lane-chip ${junction.lanes[index]}`}
              title={junction.lanes[index]}
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
                <span className="queue-lane">{lane.toUpperCase()}</span>
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