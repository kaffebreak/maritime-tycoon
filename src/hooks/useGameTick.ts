import { useEffect, useRef } from 'react';
import { useGameStore } from '../store/gameStore';
import { SIMULATION_TICK_MS } from '../constants/gameData';

export const useGameTick = () => {
  const { gameSpeed, advanceSimulation } = useGameStore();
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    if (gameSpeed === 0) return;

    const tickInterval = SIMULATION_TICK_MS / gameSpeed;
    
    intervalRef.current = setInterval(() => {
      advanceSimulation();
    }, tickInterval);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [gameSpeed, advanceSimulation]);

  // Handle visibility change for idle/background processing
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Store the time when the tab becomes hidden
        localStorage.setItem('gameHiddenTime', Date.now().toString());
      } else {
        // Calculate time difference and advance simulation accordingly
        const hiddenTime = localStorage.getItem('gameHiddenTime');
        if (hiddenTime) {
          const timeDiff = Date.now() - parseInt(hiddenTime);
          const daysPassed = Math.floor(timeDiff / (SIMULATION_TICK_MS / gameSpeed));
          
          // Advance simulation for the time that passed while away
          for (let i = 0; i < Math.min(daysPassed, 100); i++) {
            advanceSimulation();
          }
          
          localStorage.removeItem('gameHiddenTime');
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [advanceSimulation, gameSpeed]);
};