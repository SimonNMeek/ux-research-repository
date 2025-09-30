import { useState, useEffect } from 'react';
import * as SunCalc from 'suncalc';

interface SunPosition {
  altitude: number; // -90 to 90 degrees
  azimuth: number;  // 0 to 360 degrees
}

interface BackgroundColors {
  primary: string;
  secondary: string;
  gradient: string;
}

// Default coordinates (London) - can be made configurable later
const DEFAULT_LAT = 51.5074;
const DEFAULT_LON = -0.1278;

export function useSunBackground() {
  const [backgroundColors, setBackgroundColors] = useState<BackgroundColors>({
    primary: 'bg-slate-50',
    secondary: 'bg-slate-100',
    gradient: 'from-slate-50 to-slate-100'
  });

  useEffect(() => {
    const updateBackground = () => {
      const now = new Date();
      // Get sun position
      const sunPos = SunCalc.getPosition(now, DEFAULT_LAT, DEFAULT_LON);
      const sunTimes = SunCalc.getTimes(now, DEFAULT_LAT, DEFAULT_LON);
      
      // Convert altitude to 0-1 range (0 = below horizon, 1 = zenith)
      const normalizedAltitude = Math.max(0, Math.min(1, (sunPos.altitude + 0.5) / 1.5));
      
      // Determine time of day
      const isNight = now < sunTimes.dawn || now > sunTimes.dusk;
      const isDawn = now >= sunTimes.dawn && now < sunTimes.sunrise;
      const isDay = now >= sunTimes.sunrise && now < sunTimes.sunset;
      const isDusk = now >= sunTimes.sunset && now <= sunTimes.dusk;
      
      let colors: BackgroundColors;
      
      if (isNight) {
        // Deep night - dark blues and purples
        colors = {
          primary: 'bg-slate-900',
          secondary: 'bg-slate-800',
          gradient: 'from-slate-900 via-slate-800 to-slate-900'
        };
      } else if (isDawn) {
        // Dawn - soft warm oranges and pinks
        colors = {
          primary: 'bg-orange-200',
          secondary: 'bg-pink-200',
          gradient: 'from-orange-200 to-orange-300'
        };
      } else if (isDay) {
        // Day - soft blues with more pronounced gradient
        colors = {
          primary: 'bg-blue-200',
          secondary: 'bg-blue-100',
          gradient: 'from-blue-200 to-blue-300'
        };
      } else if (isDusk) {
        // Dusk - soft warm oranges and reds
        colors = {
          primary: 'bg-orange-200',
          secondary: 'bg-red-200',
          gradient: 'from-orange-200 to-orange-300'
        };
      } else {
        // Fallback
        colors = {
          primary: 'bg-slate-50',
          secondary: 'bg-slate-100',
          gradient: 'from-slate-50 to-slate-100'
        };
      }
      
      setBackgroundColors(colors);
    };

    // Update immediately
    updateBackground();
    
    // Update every 15 minutes
    const interval = setInterval(updateBackground, 15 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, []);

  return backgroundColors;
}
