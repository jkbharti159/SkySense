export interface RadarCell {
  id: string;
  name: string;
  lat: number;
  lon: number;
  bearing: number; // movement direction in degrees (0-360, e.g. 45 = NE)
  speed: number;   // km/h
  intensity: number; // in dBZ (15 - 65)
  area: number;      // km²
  intensityTrend: "STRENGTHENING" | "STABLE" | "WEAKENING";
  areaTrend: "EXPANDING" | "STABLE" | "CONTRACTING";
  classification: string;
  observedSince: string;
  history: { lat: number; lon: number; timeOffset: number; dbz: number }[];
  projected: { lat: number; lon: number; timeOffset: number }[];
}

export interface LightningStrike {
  id: string;
  lat: number;
  lon: number;
  ageMinutes: number;
  amplitudeKa: number; // Peak current in kiloAmperes
}

export interface RadarScene {
  timestamp: string;
  activeCellsCount: number;
  coverageQuality: "HIGH" | "GOOD" | "DEGRADED";
  dominantMovement: string;
  cells: RadarCell[];
  lightning: LightningStrike[];
}

// Convert bearing in degrees to unit offset vector
export function bearingToVector(bearing: number): { dLat: number; dLon: number } {
  const rad = (bearing * Math.PI) / 180;
  // Approximations for lat/lon degree changes (very rough but suitable for radar simulation visualizer)
  const dLat = Math.cos(rad) * 0.003;
  const dLon = Math.sin(rad) * 0.0035;
  return { dLat, dLon };
}

// Calculate distance in km between two lat/lon coordinates
export function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Radius of earth in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return parseFloat((R * c).toFixed(1));
}

// Map dBZ to meteorological classification
export function dbzToCategory(dbz: number): { label: string; color: string; desc: string } {
  if (dbz >= 55) return { label: "Severe Hail/Extr Storm", color: "text-fuchsia-400", desc: "Extreme atmospheric convective reflectivity (>55 dBZ). Strong potential for damaging hail." };
  if (dbz >= 45) return { label: "Heavy Precipitation", color: "text-rose-400", desc: "Heavy rain / localized thunderstorm cell (45-55 dBZ). Intense downpours." };
  if (dbz >= 35) return { label: "Moderate Rainfall", color: "text-amber-400", desc: "Moderate rain (35-45 dBZ). Steady, uniform rain bands." };
  if (dbz >= 25) return { label: "Light Precipitation", color: "text-emerald-400", desc: "Light rain or drizzle (25-35 dBZ). Minor accumulation." };
  return { label: "Atmospheric Mist/Vapor", color: "text-cyan-400", desc: "Very light mist or cloud particulates (<25 dBZ)." };
}

// Procedurally generate radar scene centered around active lat, lon
export function generateRadarScene(centerLat: number, centerLon: number): RadarScene {
  // Generate deterministic variations using coordinates as seed
  const seed = Math.abs(Math.sin(centerLat) * Math.cos(centerLon));
  
  // High-quality, realistic names for radar systems
  const cellNames = [
    ["CELL Alpha-12", "Organized Convective Cell"],
    ["CELL Bravo-08", "Isolated Convective Storm"],
    ["CELL Charlie-25", "Linear Convective Segment"],
    ["CELL Delta-03", "Developing Precipitation Cell"]
  ];

  const cells: RadarCell[] = [];

  // Generate 3 dynamic cells around the coordinates
  for (let i = 0; i < 3; i++) {
    const angle = ((seed * 1000 + i * 120) * Math.PI) / 180;
    const distanceOffset = 0.04 + (i * 0.035) + (seed * 0.02); // degree offsets
    
    // Base coordinate at NOW (t = 0)
    const baseLat = centerLat + Math.sin(angle) * distanceOffset;
    const baseLon = centerLon + Math.cos(angle) * distanceOffset;

    const bearing = Math.round((seed * 360 + i * 90 + 30) % 360);
    const speed = Math.round(25 + (seed * 40) + (i * 10)); // 25 - 75 km/h
    const intensity = Math.round(20 + (seed * 35) + (i * 8)) % 45 + 20; // 20 - 65 dBZ
    const area = Math.round(15 + (seed * 80) + (i * 25)); // km²

    const intensityTrend: "STRENGTHENING" | "STABLE" | "WEAKENING" = 
      i === 0 ? "STRENGTHENING" : i === 1 ? "STABLE" : "WEAKENING";
    
    const areaTrend: "EXPANDING" | "STABLE" | "CONTRACTING" = 
      i === 0 ? "EXPANDING" : i === 1 ? "STABLE" : "CONTRACTING";

    const classification = cellNames[i % cellNames.length][1];
    const name = cellNames[i % cellNames.length][0];

    const { dLat, dLon } = bearingToVector(bearing);

    // Create 4 points of history (past -60m, -45m, -30m, -15m)
    const history: RadarCell["history"] = [];
    for (let h = 4; h >= 1; h--) {
      const minutesAgo = h * 15;
      const historyStep = minutesAgo / 60; // fraction of hour
      const historyLat = baseLat - dLat * (speed * historyStep);
      const historyLon = baseLon - dLon * (speed * historyStep);
      const historyDbz = Math.max(15, intensity - (intensityTrend === "STRENGTHENING" ? h * 3 : -h * 2));
      history.push({
        lat: historyLat,
        lon: historyLon,
        timeOffset: -minutesAgo,
        dbz: historyDbz
      });
    }

    // Create 4 points of projections (future +15m, +30m, +45m, +60m)
    const projected: RadarCell["projected"] = [];
    for (let p = 1; p <= 4; p++) {
      const minutesAhead = p * 15;
      const projectionStep = minutesAhead / 60;
      const projLat = baseLat + dLat * (speed * projectionStep);
      const projLon = baseLon + dLon * (speed * projectionStep);
      projected.push({
        lat: projLat,
        lon: projLon,
        timeOffset: minutesAhead
      });
    }

    cells.push({
      id: `CELL-${i + 17}`,
      name,
      lat: baseLat,
      lon: baseLon,
      bearing,
      speed,
      intensity,
      area,
      intensityTrend,
      areaTrend,
      classification,
      observedSince: `${new Date(Date.now() - 3600000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
      history,
      projected
    });
  }

  // Generate lightning strikes
  const lightning: LightningStrike[] = [];
  const strikeCount = Math.round(seed * 6) + 2; // 2 - 8 strikes
  for (let s = 0; s < strikeCount; s++) {
    // Generate near the stronger cells (cell 0 or 1)
    const anchorCell = cells[s % 2];
    const latOffset = (Math.sin(s * 45) * 0.012) * (seed + 0.5);
    const lonOffset = (Math.cos(s * 45) * 0.012) * (seed + 0.5);
    lightning.push({
      id: `LTG-${s + 101}`,
      lat: anchorCell.lat + latOffset,
      lon: anchorCell.lon + lonOffset,
      ageMinutes: Math.round(s * 3.5),
      amplitudeKa: Math.round(15 + (seed * 80) + s * 5)
    });
  }

  const dominantMovement = cells[0].bearing >= 315 || cells[0].bearing < 45 ? "Northwards" :
                           cells[0].bearing >= 45 && cells[0].bearing < 135 ? "Eastwards (NE/ENE)" :
                           cells[0].bearing >= 135 && cells[0].bearing < 225 ? "Southwards" : "Westwards";

  return {
    timestamp: new Date().toLocaleTimeString(),
    activeCellsCount: cells.length,
    coverageQuality: seed > 0.85 ? "DEGRADED" : seed > 0.4 ? "GOOD" : "HIGH",
    dominantMovement,
    cells,
    lightning
  };
}
