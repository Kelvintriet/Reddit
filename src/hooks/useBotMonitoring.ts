// Bot Monitoring Hook
// Automatically starts and manages the bot execution system

import { useEffect } from 'react';
import { startBotMonitoring, stopBotMonitoring } from '../services/botExecutionService';

export const useBotMonitoring = () => {
  useEffect(() => {
    // Start bot monitoring when the app loads
    startBotMonitoring();
    
    // Cleanup when component unmounts
    return () => {
      stopBotMonitoring();
    };
  }, []);
};

export default useBotMonitoring;
