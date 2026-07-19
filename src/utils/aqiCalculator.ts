export type AQIStandard = "US" | "IN" | "EU" | "WHO";

export interface CalculatedAQI {
  aqi: number;
  label: string;
  color: string;
  bgColor: string;
  borderColor: string;
  description: string;
  subIndices: {
    pm2_5: number;
    pm10: number;
    no2: number;
    o3: number;
    co: number;
    so2: number;
  };
  pollutantLabels: {
    pm2_5: string;
    pm10: string;
    no2: string;
    o3: string;
    co: string;
    so2: string;
  };
}

function interpolate(c: number, cLow: number, cHigh: number, iLow: number, iHigh: number): number {
  if (cHigh === cLow) return iLow;
  const val = ((iHigh - iLow) / (cHigh - cLow)) * (c - cLow) + iLow;
  return Math.max(iLow, Math.min(iHigh, Math.round(val)));
}

// 1. US EPA AQI Calculation
function calcUSAQI(pollutants: {
  pm2_5: number;
  pm10: number;
  no2: number;
  o3: number;
  co: number;
  so2: number;
}): CalculatedAQI {
  const { pm2_5, pm10, no2, o3, co, so2 } = pollutants;

  // PM2.5 breakpoints
  let idxPm25 = 0;
  if (pm2_5 <= 12.0) idxPm25 = interpolate(pm2_5, 0, 12.0, 0, 50);
  else if (pm2_5 <= 35.4) idxPm25 = interpolate(pm2_5, 12.1, 35.4, 51, 100);
  else if (pm2_5 <= 55.4) idxPm25 = interpolate(pm2_5, 35.5, 55.4, 101, 150);
  else if (pm2_5 <= 150.4) idxPm25 = interpolate(pm2_5, 55.5, 150.4, 151, 200);
  else if (pm2_5 <= 250.4) idxPm25 = interpolate(pm2_5, 150.5, 250.4, 201, 300);
  else if (pm2_5 <= 350.4) idxPm25 = interpolate(pm2_5, 250.5, 350.4, 301, 400);
  else idxPm25 = interpolate(pm2_5, 350.5, 500.4, 401, 500);

  // PM10 breakpoints
  let idxPm10 = 0;
  if (pm10 <= 54) idxPm10 = interpolate(pm10, 0, 54, 0, 50);
  else if (pm10 <= 154) idxPm10 = interpolate(pm10, 55, 154, 51, 100);
  else if (pm10 <= 254) idxPm10 = interpolate(pm10, 155, 254, 101, 150);
  else if (pm10 <= 354) idxPm10 = interpolate(pm10, 255, 354, 151, 200);
  else if (pm10 <= 424) idxPm10 = interpolate(pm10, 355, 424, 201, 300);
  else if (pm10 <= 504) idxPm10 = interpolate(pm10, 425, 504, 301, 400);
  else idxPm10 = interpolate(pm10, 505, 604, 401, 500);

  // NO2 breakpoints (using ug/m3 approx)
  let idxNo2 = 0;
  if (no2 <= 100) idxNo2 = interpolate(no2, 0, 100, 0, 50);
  else if (no2 <= 188) idxNo2 = interpolate(no2, 101, 188, 51, 100);
  else if (no2 <= 677) idxNo2 = interpolate(no2, 189, 677, 101, 150);
  else if (no2 <= 1220) idxNo2 = interpolate(no2, 678, 1220, 151, 200);
  else if (no2 <= 2350) idxNo2 = interpolate(no2, 1221, 2350, 201, 300);
  else if (no2 <= 3100) idxNo2 = interpolate(no2, 2351, 3100, 301, 400);
  else idxNo2 = interpolate(no2, 3101, 3850, 401, 500);

  // O3 breakpoints (ug/m3 approx)
  let idxO3 = 0;
  if (o3 <= 106) idxO3 = interpolate(o3, 0, 106, 0, 50);
  else if (o3 <= 137) idxO3 = interpolate(o3, 107, 137, 51, 100);
  else if (o3 <= 167) idxO3 = interpolate(o3, 138, 167, 101, 150);
  else if (o3 <= 206) idxO3 = interpolate(o3, 168, 206, 151, 200);
  else if (o3 <= 392) idxO3 = interpolate(o3, 207, 392, 201, 300);
  else if (o3 <= 784) idxO3 = interpolate(o3, 393, 784, 301, 400);
  else idxO3 = interpolate(o3, 785, 980, 401, 500);

  // CO breakpoints (ug/m3)
  let idxCo = 0;
  if (co <= 5060) idxCo = interpolate(co, 0, 5060, 0, 50);
  else if (co <= 10810) idxCo = interpolate(co, 5061, 10810, 51, 100);
  else if (co <= 14260) idxCo = interpolate(co, 10811, 14260, 101, 150);
  else if (co <= 17710) idxCo = interpolate(co, 14261, 17710, 151, 200);
  else if (co <= 34960) idxCo = interpolate(co, 17711, 34960, 201, 300);
  else if (co <= 46460) idxCo = interpolate(co, 34961, 46460, 301, 400);
  else idxCo = interpolate(co, 46461, 57960, 401, 500);

  // SO2 breakpoints (ug/m3)
  let idxSo2 = 0;
  if (so2 <= 91) idxSo2 = interpolate(so2, 0, 91, 0, 50);
  else if (so2 <= 196) idxSo2 = interpolate(so2, 92, 196, 51, 100);
  else if (so2 <= 484) idxSo2 = interpolate(so2, 197, 484, 101, 150);
  else if (so2 <= 796) idxSo2 = interpolate(so2, 485, 796, 151, 200);
  else if (so2 <= 1582) idxSo2 = interpolate(so2, 797, 1582, 201, 300);
  else if (so2 <= 2106) idxSo2 = interpolate(so2, 1583, 2106, 301, 400);
  else idxSo2 = interpolate(so2, 2107, 2630, 401, 500);

  const finalAqi = Math.max(idxPm25, idxPm10, idxNo2, idxO3, idxCo, idxSo2);

  let label = "Good";
  let color = "#10b981"; // Emerald
  let bgColor = "rgba(16, 185, 129, 0.1)";
  let borderColor = "rgba(16, 185, 129, 0.2)";
  let description = "Air quality is satisfactory, and air pollution poses little or no risk.";

  if (finalAqi > 50) {
    label = "Moderate";
    color = "#14b8a6"; // Teal
    bgColor = "rgba(20, 184, 166, 0.1)";
    borderColor = "rgba(20, 184, 166, 0.2)";
    description = "Air quality is acceptable. However, there may be a risk for some people, particularly those who are unusually sensitive to air pollution.";
  }
  if (finalAqi > 100) {
    label = "Unhealthy for Sensitive Groups";
    color = "#f59e0b"; // Amber
    bgColor = "rgba(245, 158, 11, 0.1)";
    borderColor = "rgba(245, 158, 11, 0.2)";
    description = "Members of sensitive groups (asthmatics, children, elderly) may experience health effects. The general public is less likely to be affected.";
  }
  if (finalAqi > 150) {
    label = "Unhealthy";
    color = "#ef4444"; // Red
    bgColor = "rgba(239, 68, 68, 0.1)";
    borderColor = "rgba(239, 68, 68, 0.2)";
    description = "Some members of the general public may experience health effects; members of sensitive groups may experience more serious health effects.";
  }
  if (finalAqi > 200) {
    label = "Very Unhealthy";
    color = "#a855f7"; // Purple
    bgColor = "rgba(168, 85, 247, 0.1)";
    borderColor = "rgba(168, 85, 247, 0.2)";
    description = "Health alert: The risk of health effects is increased for everyone. Outdoor physical activities should be significantly reduced.";
  }
  if (finalAqi > 300) {
    label = "Hazardous";
    color = "#7f1d1d"; // Dark Red
    bgColor = "rgba(127, 29, 29, 0.1)";
    borderColor = "rgba(127, 29, 29, 0.2)";
    description = "Health warning of emergency conditions: everyone is more likely to experience severe health effects. Avoid all outdoor physical activity.";
  }

  const getSubLabel = (subVal: number) => {
    if (subVal <= 50) return "Good";
    if (subVal <= 100) return "Moderate";
    if (subVal <= 150) return "Sensitive Warning";
    if (subVal <= 200) return "Unhealthy";
    return "Very Unhealthy";
  };

  return {
    aqi: finalAqi,
    label,
    color,
    bgColor,
    borderColor,
    description,
    subIndices: {
      pm2_5: Math.round(idxPm25),
      pm10: Math.round(idxPm10),
      no2: Math.round(idxNo2),
      o3: Math.round(idxO3),
      co: Math.round(idxCo),
      so2: Math.round(idxSo2)
    },
    pollutantLabels: {
      pm2_5: getSubLabel(idxPm25),
      pm10: getSubLabel(idxPm10),
      no2: getSubLabel(idxNo2),
      o3: getSubLabel(idxO3),
      co: getSubLabel(idxCo),
      so2: getSubLabel(idxSo2)
    }
  };
}

// 2. Indian National AQI (NAQI) Calculation
function calcIndianAQI(pollutants: {
  pm2_5: number;
  pm10: number;
  no2: number;
  o3: number;
  co: number;
  so2: number;
}): CalculatedAQI {
  const { pm2_5, pm10, no2, o3, co, so2 } = pollutants;

  // PM2.5 breakpoints (0-30, 31-60, 61-90, 91-120, 121-250, 250+)
  let idxPm25 = 0;
  if (pm2_5 <= 30) idxPm25 = interpolate(pm2_5, 0, 30, 0, 50);
  else if (pm2_5 <= 60) idxPm25 = interpolate(pm2_5, 31, 60, 51, 100);
  else if (pm2_5 <= 90) idxPm25 = interpolate(pm2_5, 61, 90, 101, 200);
  else if (pm2_5 <= 120) idxPm25 = interpolate(pm2_5, 91, 120, 201, 300);
  else if (pm2_5 <= 250) idxPm25 = interpolate(pm2_5, 121, 250, 301, 400);
  else idxPm25 = interpolate(pm2_5, 251, 500, 401, 500);

  // PM10 breakpoints (0-50, 51-100, 101-250, 251-350, 351-430, 430+)
  let idxPm10 = 0;
  if (pm10 <= 50) idxPm10 = interpolate(pm10, 0, 50, 0, 50);
  else if (pm10 <= 100) idxPm10 = interpolate(pm10, 51, 100, 51, 100);
  else if (pm10 <= 250) idxPm10 = interpolate(pm10, 101, 250, 101, 200);
  else if (pm10 <= 350) idxPm10 = interpolate(pm10, 251, 350, 201, 300);
  else if (pm10 <= 430) idxPm10 = interpolate(pm10, 351, 430, 301, 400);
  else idxPm10 = interpolate(pm10, 431, 600, 401, 500);

  // NO2 breakpoints (0-40, 41-80, 81-180, 181-280, 281-400, 400+)
  let idxNo2 = 0;
  if (no2 <= 40) idxNo2 = interpolate(no2, 0, 40, 0, 50);
  else if (no2 <= 80) idxNo2 = interpolate(no2, 41, 80, 51, 100);
  else if (no2 <= 180) idxNo2 = interpolate(no2, 81, 180, 101, 200);
  else if (no2 <= 280) idxNo2 = interpolate(no2, 181, 280, 201, 300);
  else if (no2 <= 400) idxNo2 = interpolate(no2, 281, 400, 301, 400);
  else idxNo2 = interpolate(no2, 401, 600, 401, 500);

  // O3 breakpoints (0-50, 51-100, 101-168, 169-208, 209-748, 748+)
  let idxO3 = 0;
  if (o3 <= 50) idxO3 = interpolate(o3, 0, 50, 0, 50);
  else if (o3 <= 100) idxO3 = interpolate(o3, 51, 100, 51, 100);
  else if (o3 <= 168) idxO3 = interpolate(o3, 101, 168, 101, 200);
  else if (o3 <= 208) idxO3 = interpolate(o3, 169, 208, 201, 300);
  else if (o3 <= 748) idxO3 = interpolate(o3, 209, 748, 301, 400);
  else idxO3 = interpolate(o3, 749, 1000, 401, 500);

  // CO breakpoints (converted from mg/m3: 0-2, 2-4, 4-10, 10-17, 17-34, 34+ mg/m3)
  // 1 mg/m3 = 1000 ug/m3
  let idxCo = 0;
  if (co <= 2000) idxCo = interpolate(co, 0, 2000, 0, 50);
  else if (co <= 4000) idxCo = interpolate(co, 2001, 4000, 51, 100);
  else if (co <= 10000) idxCo = interpolate(co, 4001, 10000, 101, 200);
  else if (co <= 17000) idxCo = interpolate(co, 10001, 17000, 201, 300);
  else if (co <= 34000) idxCo = interpolate(co, 17001, 34000, 301, 400);
  else idxCo = interpolate(co, 34001, 50000, 401, 500);

  // SO2 breakpoints (0-40, 41-80, 81-380, 381-800, 801-1600, 1600+)
  let idxSo2 = 0;
  if (so2 <= 40) idxSo2 = interpolate(so2, 0, 40, 0, 50);
  else if (so2 <= 80) idxSo2 = interpolate(so2, 41, 80, 51, 100);
  else if (so2 <= 380) idxSo2 = interpolate(so2, 81, 380, 101, 200);
  else if (so2 <= 800) idxSo2 = interpolate(so2, 381, 800, 201, 300);
  else if (so2 <= 1600) idxSo2 = interpolate(so2, 801, 1600, 301, 400);
  else idxSo2 = interpolate(so2, 1601, 2000, 401, 500);

  const finalAqi = Math.max(idxPm25, idxPm10, idxNo2, idxO3, idxCo, idxSo2);

  let label = "Good";
  let color = "#10b981"; // Emerald
  let bgColor = "rgba(16, 185, 129, 0.1)";
  let borderColor = "rgba(16, 185, 129, 0.2)";
  let description = "Minimal impact. Air quality is safe for all activities.";

  if (finalAqi > 50) {
    label = "Satisfactory";
    color = "#84cc16"; // Lime
    bgColor = "rgba(132, 204, 22, 0.1)";
    borderColor = "rgba(132, 204, 22, 0.2)";
    description = "Satisfactory. May cause minor breathing discomfort to sensitive people.";
  }
  if (finalAqi > 100) {
    label = "Moderately Polluted";
    color = "#f59e0b"; // Amber
    bgColor = "rgba(245, 158, 11, 0.1)";
    borderColor = "rgba(245, 158, 11, 0.2)";
    description = "May cause breathing discomfort to people with asthma, lung, and heart diseases.";
  }
  if (finalAqi > 200) {
    label = "Poor";
    color = "#f97316"; // Orange
    bgColor = "rgba(249, 115, 22, 0.1)";
    borderColor = "rgba(249, 115, 22, 0.2)";
    description = "May cause breathing discomfort to most people on prolonged exposure.";
  }
  if (finalAqi > 300) {
    label = "Very Poor";
    color = "#ef4444"; // Red
    bgColor = "rgba(239, 68, 68, 0.1)";
    borderColor = "rgba(239, 68, 68, 0.2)";
    description = "May cause respiratory illness on prolonged exposure. Pronounced effect on people with lung/heart diseases.";
  }
  if (finalAqi > 400) {
    label = "Severe";
    color = "#7f1d1d"; // Dark Red
    bgColor = "rgba(127, 29, 29, 0.1)";
    borderColor = "rgba(127, 29, 29, 0.2)";
    description = "Affects healthy people and seriously impacts those with existing respiratory or cardiovascular ailments.";
  }

  const getSubLabel = (subVal: number) => {
    if (subVal <= 50) return "Good";
    if (subVal <= 100) return "Satisfactory";
    if (subVal <= 200) return "Moderate";
    if (subVal <= 300) return "Poor";
    if (subVal <= 400) return "Very Poor";
    return "Severe";
  };

  return {
    aqi: finalAqi,
    label,
    color,
    bgColor,
    borderColor,
    description,
    subIndices: {
      pm2_5: Math.round(idxPm25),
      pm10: Math.round(idxPm10),
      no2: Math.round(idxNo2),
      o3: Math.round(idxO3),
      co: Math.round(idxCo),
      so2: Math.round(idxSo2)
    },
    pollutantLabels: {
      pm2_5: getSubLabel(idxPm25),
      pm10: getSubLabel(idxPm10),
      no2: getSubLabel(idxNo2),
      o3: getSubLabel(idxO3),
      co: getSubLabel(idxCo),
      so2: getSubLabel(idxSo2)
    }
  };
}

// 3. European CAQI Calculation (Common Air Quality Index)
function calcEUAQI(pollutants: {
  pm2_5: number;
  pm10: number;
  no2: number;
  o3: number;
  co: number;
  so2: number;
}): CalculatedAQI {
  const { pm2_5, pm10, no2, o3, co, so2 } = pollutants;

  // Band boundaries mapped 0-25 (Very Low), 25-50 (Low), 50-75 (Medium), 75-100 (High), 100-150 (Very High)
  let idxPm25 = 0;
  if (pm2_5 <= 10) idxPm25 = interpolate(pm2_5, 0, 10, 0, 25);
  else if (pm2_5 <= 20) idxPm25 = interpolate(pm2_5, 11, 20, 26, 50);
  else if (pm2_5 <= 25) idxPm25 = interpolate(pm2_5, 21, 25, 51, 75);
  else if (pm2_5 <= 50) idxPm25 = interpolate(pm2_5, 26, 50, 76, 100);
  else idxPm25 = interpolate(pm2_5, 51, 100, 101, 150);

  let idxPm10 = 0;
  if (pm10 <= 25) idxPm10 = interpolate(pm10, 0, 25, 0, 25);
  else if (pm10 <= 50) idxPm10 = interpolate(pm10, 26, 50, 26, 50);
  else if (pm10 <= 90) idxPm10 = interpolate(pm10, 51, 90, 51, 75);
  else if (pm10 <= 180) idxPm10 = interpolate(pm10, 91, 180, 76, 100);
  else idxPm10 = interpolate(pm10, 181, 360, 101, 150);

  let idxNo2 = 0;
  if (no2 <= 50) idxNo2 = interpolate(no2, 0, 50, 0, 25);
  else if (no2 <= 100) idxNo2 = interpolate(no2, 51, 100, 26, 50);
  else if (no2 <= 200) idxNo2 = interpolate(no2, 101, 200, 51, 75);
  else if (no2 <= 400) idxNo2 = interpolate(no2, 201, 400, 76, 100);
  else idxNo2 = interpolate(no2, 401, 600, 101, 150);

  let idxO3 = 0;
  if (o3 <= 60) idxO3 = interpolate(o3, 0, 60, 0, 25);
  else if (o3 <= 120) idxO3 = interpolate(o3, 61, 120, 26, 50);
  else if (o3 <= 180) idxO3 = interpolate(o3, 121, 180, 51, 75);
  else if (o3 <= 240) idxO3 = interpolate(o3, 181, 240, 76, 100);
  else idxO3 = interpolate(o3, 241, 360, 101, 150);

  let idxCo = 0;
  if (co <= 5000) idxCo = interpolate(co, 0, 5000, 0, 25);
  else if (co <= 10000) idxCo = interpolate(co, 5001, 10000, 26, 50);
  else if (co <= 15000) idxCo = interpolate(co, 10001, 15000, 51, 75);
  else if (co <= 20000) idxCo = interpolate(co, 15001, 20000, 76, 100);
  else idxCo = interpolate(co, 20001, 30000, 101, 150);

  let idxSo2 = 0;
  if (so2 <= 50) idxSo2 = interpolate(so2, 0, 50, 0, 25);
  else if (so2 <= 100) idxSo2 = interpolate(so2, 51, 100, 26, 50);
  else if (so2 <= 350) idxSo2 = interpolate(so2, 101, 350, 51, 75);
  else if (so2 <= 500) idxSo2 = interpolate(so2, 351, 500, 76, 100);
  else idxSo2 = interpolate(so2, 501, 750, 101, 150);

  const finalAqi = Math.max(idxPm25, idxPm10, idxNo2, idxO3, idxCo, idxSo2);

  let label = "Very Low Index";
  let color = "#10b981"; // Emerald
  let bgColor = "rgba(16, 185, 129, 0.1)";
  let borderColor = "rgba(16, 185, 129, 0.2)";
  let description = "Air quality is excellent. No precautions needed.";

  if (finalAqi > 25) {
    label = "Low Index";
    color = "#84cc16"; // Lime
    bgColor = "rgba(132, 204, 22, 0.1)";
    borderColor = "rgba(132, 204, 22, 0.2)";
    description = "Air quality is good. Safe for outdoor recreation.";
  }
  if (finalAqi > 50) {
    label = "Medium Index";
    color = "#f59e0b"; // Amber
    bgColor = "rgba(245, 158, 11, 0.1)";
    borderColor = "rgba(245, 158, 11, 0.2)";
    description = "Air quality is moderate. Slight risk for highly sensitive profiles.";
  }
  if (finalAqi > 75) {
    label = "High Index";
    color = "#ef4444"; // Red
    bgColor = "rgba(239, 68, 68, 0.1)";
    borderColor = "rgba(239, 68, 68, 0.2)";
    description = "Air is polluted. Consider reducing heavy outdoor exercises.";
  }
  if (finalAqi > 100) {
    label = "Very High Index";
    color = "#7f1d1d"; // Dark Red
    bgColor = "rgba(127, 29, 29, 0.1)";
    borderColor = "rgba(127, 29, 29, 0.2)";
    description = "Air quality is extremely poor. Minimize outdoor exposures.";
  }

  const getSubLabel = (subVal: number) => {
    if (subVal <= 25) return "Very Low";
    if (subVal <= 50) return "Low";
    if (subVal <= 75) return "Medium";
    if (subVal <= 100) return "High";
    return "Very High";
  };

  return {
    aqi: finalAqi,
    label,
    color,
    bgColor,
    borderColor,
    description,
    subIndices: {
      pm2_5: Math.round(idxPm25),
      pm10: Math.round(idxPm10),
      no2: Math.round(idxNo2),
      o3: Math.round(idxO3),
      co: Math.round(idxCo),
      so2: Math.round(idxSo2)
    },
    pollutantLabels: {
      pm2_5: getSubLabel(idxPm25),
      pm10: getSubLabel(idxPm10),
      no2: getSubLabel(idxNo2),
      o3: getSubLabel(idxO3),
      co: getSubLabel(idxCo),
      so2: getSubLabel(idxSo2)
    }
  };
}

// 4. WHO Guidelines Standard (Index 100 = Strict limit)
function calcWHOAQI(pollutants: {
  pm2_5: number;
  pm10: number;
  no2: number;
  o3: number;
  co: number;
  so2: number;
}): CalculatedAQI {
  const { pm2_5, pm10, no2, o3, co, so2 } = pollutants;

  // Strictly 24h targets: Limit represented as index 100.
  // PM2.5 limit = 15; PM10 limit = 45; NO2 limit = 25; O3 limit = 100; CO limit = 4000; SO2 limit = 40.
  const idxPm25 = Math.round((pm2_5 / 15) * 100);
  const idxPm10 = Math.round((pm10 / 45) * 100);
  const idxNo2 = Math.round((no2 / 25) * 100);
  const idxO3 = Math.round((o3 / 100) * 100);
  const idxCo = Math.round((co / 4000) * 100);
  const idxSo2 = Math.round((so2 / 40) * 100);

  const finalAqi = Math.max(idxPm25, idxPm10, idxNo2, idxO3, idxCo, idxSo2);

  let label = "Meets WHO Guideline";
  let color = "#10b981"; // Emerald
  let bgColor = "rgba(16, 185, 129, 0.1)";
  let borderColor = "rgba(16, 185, 129, 0.2)";
  let description = "Air quality meets the highly stringent health guidelines recommended by the WHO.";

  if (finalAqi > 100) {
    label = "Exceeds WHO Target (Mild)";
    color = "#f59e0b"; // Amber
    bgColor = "rgba(245, 158, 11, 0.1)";
    borderColor = "rgba(245, 158, 11, 0.2)";
    description = `Air quality exceeds strict WHO limits (Max sub-index is ${finalAqi}% of guideline). Potential health impact over long chronic exposure.`;
  }
  if (finalAqi > 200) {
    label = "Exceeds WHO Target (Heavy)";
    color = "#ef4444"; // Red
    bgColor = "rgba(239, 68, 68, 0.1)";
    borderColor = "rgba(239, 68, 68, 0.2)";
    description = `Air quality is more than double the strict WHO limits. Long exposure presents clear systemic inflammatory risk.`;
  }
  if (finalAqi > 400) {
    label = "Exceeds WHO Target (Extreme)";
    color = "#7f1d1d"; // Dark Red
    bgColor = "rgba(127, 29, 29, 0.1)";
    borderColor = "rgba(127, 29, 29, 0.2)";
    description = `Air quality is extremely dangerous, exceeding WHO guidelines by over four-fold. Significant health strain.`;
  }

  const getSubLabel = (subVal: number) => {
    if (subVal <= 100) return "Meets Target";
    if (subVal <= 200) return "Exceeds 1-2x";
    if (subVal <= 400) return "Exceeds 2-4x";
    return "Exceeds 4x+";
  };

  return {
    aqi: finalAqi,
    label,
    color,
    bgColor,
    borderColor,
    description,
    subIndices: {
      pm2_5: idxPm25,
      pm10: idxPm10,
      no2: idxNo2,
      o3: idxO3,
      co: idxCo,
      so2: idxSo2
    },
    pollutantLabels: {
      pm2_5: getSubLabel(idxPm25),
      pm10: getSubLabel(idxPm10),
      no2: getSubLabel(idxNo2),
      o3: getSubLabel(idxO3),
      co: getSubLabel(idxCo),
      so2: getSubLabel(idxSo2)
    }
  };
}

export function calculateAQI(
  standard: AQIStandard,
  pollutants: {
    pm2_5: number;
    pm10: number;
    no2: number;
    o3: number;
    co: number;
    so2: number;
  }
): CalculatedAQI {
  switch (standard) {
    case "IN":
      return calcIndianAQI(pollutants);
    case "EU":
      return calcEUAQI(pollutants);
    case "WHO":
      return calcWHOAQI(pollutants);
    case "US":
    default:
      return calcUSAQI(pollutants);
  }
}
