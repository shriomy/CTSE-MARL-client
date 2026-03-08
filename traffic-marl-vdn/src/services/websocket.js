import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { WS_CONFIG } from '../constants';

const WebSocketContext = createContext(null);

export const useWebSocket = () => {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('useWebSocket must be used within a WebSocketProvider');
  }
  return context;
};

export const WebSocketProvider = ({ children }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const wsRef = useRef(null);
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimeoutRef = useRef(null);
  const lastTrafficUpdateTsRef = useRef(0);
  const trafficFlushTimeoutRef = useRef(null);
  const queuedTrafficUpdateRef = useRef(null);

  const TRAFFIC_UPDATE_MIN_INTERVAL_MS = 180;

  const flushQueuedTrafficUpdate = () => {
    trafficFlushTimeoutRef.current = null;
    if (!queuedTrafficUpdateRef.current) {
      return;
    }
    lastTrafficUpdateTsRef.current = Date.now();
    setData(queuedTrafficUpdateRef.current);
    queuedTrafficUpdateRef.current = null;
  };

  const handleIncomingData = (parsedData) => {
    if (parsedData?.type !== 'traffic_update') {
      setData(parsedData);
      return;
    }

    const now = Date.now();
    const elapsed = now - lastTrafficUpdateTsRef.current;
    if (elapsed >= TRAFFIC_UPDATE_MIN_INTERVAL_MS) {
      lastTrafficUpdateTsRef.current = now;
      setData(parsedData);
      return;
    }

    // Keep only the latest traffic packet and flush soon to avoid UI thrash.
    queuedTrafficUpdateRef.current = parsedData;
    if (!trafficFlushTimeoutRef.current) {
      trafficFlushTimeoutRef.current = setTimeout(
        flushQueuedTrafficUpdate,
        TRAFFIC_UPDATE_MIN_INTERVAL_MS - elapsed
      );
    }
  };

  const scheduleReconnect = () => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    reconnectAttemptsRef.current += 1;
    const attempt = reconnectAttemptsRef.current;

    // Keep trying forever with bounded backoff so the app auto-recovers
    // when backend starts after the frontend.
    const baseDelay = WS_CONFIG.reconnectInterval || 3000;
    const delay = Math.min(baseDelay * Math.max(1, Math.floor(attempt / 2)), 15000);
    console.log(`Reconnecting... Attempt ${attempt} (in ${delay}ms)`);

    reconnectTimeoutRef.current = setTimeout(() => {
      connect();
    }, delay);
  };

  const connect = () => {
    try {
      wsRef.current = new WebSocket(WS_CONFIG.url);

      wsRef.current.onopen = () => {
        console.log('WebSocket connected');
        setIsConnected(true);
        setError(null);
        reconnectAttemptsRef.current = 0;
      };

      wsRef.current.onmessage = (event) => {
        try {
          const parsedData = JSON.parse(event.data);
          handleIncomingData(parsedData);
        } catch (err) {
          console.error('Error parsing WebSocket message:', err);
        }
      };

      wsRef.current.onclose = () => {
        console.log('WebSocket disconnected');
        setIsConnected(false);

        scheduleReconnect();
      };

      wsRef.current.onerror = (err) => {
        console.error('WebSocket error:', err);
        setError('WebSocket connection error');
      };
    } catch (err) {
      console.error('Failed to create WebSocket:', err);
      setError('Failed to create WebSocket connection');
    }
  };

  const disconnect = () => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    if (trafficFlushTimeoutRef.current) {
      clearTimeout(trafficFlushTimeoutRef.current);
      trafficFlushTimeoutRef.current = null;
    }
    queuedTrafficUpdateRef.current = null;
    
    setIsConnected(false);
  };

  const sendMessage = (message) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    } else {
      console.warn('WebSocket is not connected');
    }
  };

  useEffect(() => {
    connect();

    return () => {
      disconnect();
    };
  }, []);

  const value = {
    isConnected,
    data,
    error,
    sendMessage,
    reconnect: connect,
    disconnect
  };

  return (
    <WebSocketContext.Provider value={value}>
      {children}
    </WebSocketContext.Provider>
  );
};