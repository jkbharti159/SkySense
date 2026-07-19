import { useEffect, useRef, useState } from "react";
import * as THREE from "three";

interface Weather3DBackgroundProps {
  conditionCode: number;
  isDay: boolean;
  windSpeed: number;
  clouds: number;
  temp: number;
  graphicsMode: "high" | "perf";
}

export default function Weather3DBackground({
  conditionCode,
  isDay,
  windSpeed,
  clouds,
  temp,
  graphicsMode
}: Weather3DBackgroundProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [webglSupported, setWebglSupported] = useState(true);

  // State mapping for easy CSS animations
  const [ambientTheme, setAmbientTheme] = useState({
    bgGradient: "from-slate-900 to-indigo-950",
    cloudDensity: clouds,
    effectType: "none" as "none" | "rain" | "snow" | "fog" | "storm"
  });

  // Calculate weather states for the scene
  const isRain = (conditionCode >= 51 && conditionCode <= 67) || (conditionCode >= 80 && conditionCode <= 82);
  const isSnow = (conditionCode >= 71 && conditionCode <= 77) || (conditionCode >= 85 && conditionCode <= 86);
  const isThunderstorm = conditionCode >= 95;
  const isFog = conditionCode === 45 || conditionCode === 48;

  useEffect(() => {
    // 1. Establish the color background/gradients depending on weather
    let bg = "from-blue-600 to-indigo-900"; // Clear day default
    let effect: "none" | "rain" | "snow" | "fog" | "storm" = "none";

    if (!isDay) {
      bg = "from-gray-950 to-indigo-950";
    } else if (isThunderstorm) {
      bg = "from-slate-800 to-zinc-900";
      effect = "storm";
    } else if (isRain) {
      bg = "from-sky-700 to-slate-800";
      effect = "rain";
    } else if (isSnow) {
      bg = "from-blue-100 to-sky-300 text-slate-800";
      effect = "snow";
    } else if (isFog) {
      bg = "from-zinc-400 to-slate-600";
      effect = "fog";
    } else if (clouds > 60) {
      bg = "from-slate-400 to-blue-600";
    } else if (clouds > 30) {
      bg = "from-sky-400 to-indigo-700";
    } else if (temp > 30) {
      bg = "from-amber-500 to-orange-700"; // hot sunset-like
    }

    setAmbientTheme({
      bgGradient: bg,
      cloudDensity: clouds,
      effectType: effect
    });

    if (graphicsMode === "perf") {
      return; // Skip WebGL initialization
    }

    // 2. Three.js Rendering Pipeline
    const canvas = canvasRef.current;
    if (!canvas) return;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        canvas,
        antialias: true,
        alpha: true,
        powerPreference: "high-performance"
      });
      setWebglSupported(true);
    } catch (e) {
      console.warn("WebGL unsupported, falling back to 2D animations:", e);
      setWebglSupported(false);
      return;
    }

    const scene = new THREE.Scene();
    
    // Set appropriate Fog based on weather conditions
    let fogColor = 0x1e1b4b; // default deep indigo
    let fogDensity = 0.015;

    if (isDay) {
      if (isThunderstorm) {
        fogColor = 0x27272a;
        fogDensity = 0.04;
      } else if (isRain) {
        fogColor = 0x475569;
        fogDensity = 0.035;
      } else if (isSnow) {
        fogColor = 0xe2e8f0;
        fogDensity = 0.025;
      } else if (isFog) {
        fogColor = 0xa1a1aa;
        fogDensity = 0.08;
      } else {
        fogColor = 0x0ea5e9; // sky blue
        fogDensity = 0.01;
      }
    } else {
      fogColor = 0x09090b; // deep dark night
      fogDensity = 0.02;
    }

    scene.fog = new THREE.FogExp2(fogColor, fogDensity);

    // Camera
    const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 100);
    camera.position.set(0, 0, 15);

    // Lights
    const ambientLight = new THREE.AmbientLight(isDay ? 0xffffff : 0x222244, isDay ? 1.0 : 0.5);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(
      temp > 30 ? 0xf59e0b : 0xffffff, 
      isDay ? 1.2 : 0.2
    );
    dirLight.position.set(5, 10, 7);
    scene.add(dirLight);

    // 3D Clouds creation
    const cloudsGroup = new THREE.Group();
    scene.add(cloudsGroup);

    const cloudCount = Math.min(20, Math.floor(clouds / 5) + 2);
    const cloudGeo = new THREE.SphereGeometry(2, 7, 7);
    const cloudMat = new THREE.MeshLambertMaterial({
      color: isDay ? (isThunderstorm || isRain ? 0x55555d : 0xf1f5f9) : 0x1e293b,
      transparent: true,
      opacity: isDay ? 0.8 : 0.6
    });

    const cloudsArray: THREE.Mesh[] = [];
    for (let i = 0; i < cloudCount; i++) {
      const cloud = new THREE.Mesh(cloudGeo, cloudMat);
      // Scatter clouds
      cloud.position.set(
        (Math.random() - 0.5) * 35,
        Math.random() * 8 + 2,
        (Math.random() - 0.5) * 15 - 5
      );
      // Random scales to look volumetric
      const scaleX = Math.random() * 2 + 1.5;
      const scaleY = scaleX * 0.5;
      const scaleZ = scaleX * 0.7;
      cloud.scale.set(scaleX, scaleY, scaleZ);
      cloudsGroup.add(cloud);
      cloudsArray.push(cloud);
    }

    // Dynamic weather particle effects
    let particlesGeo: THREE.BufferGeometry | null = null;
    let particlesMat: THREE.PointsMaterial | null = null;
    let particles: THREE.Points | null = null;
    const particleCount = isRain ? 1200 : isSnow ? 600 : 0;
    
    let positions: Float32Array;
    let velocities: number[] = [];

    if (particleCount > 0) {
      particlesGeo = new THREE.BufferGeometry();
      positions = new Float32Array(particleCount * 3);
      
      for (let i = 0; i < particleCount; i++) {
        // Position
        positions[i * 3] = (Math.random() - 0.5) * 40;
        positions[i * 3 + 1] = Math.random() * 30 - 10;
        positions[i * 3 + 2] = (Math.random() - 0.5) * 20;

        // Velocity
        if (isRain) {
          velocities.push(
            (Math.random() - 0.5) * 0.1, // drift
            -(Math.random() * 0.3 + 0.3), // speed
            0
          );
        } else {
          // snow
          velocities.push(
            (Math.random() - 0.5) * 0.05,
            -(Math.random() * 0.05 + 0.03),
            (Math.random() - 0.5) * 0.03
          );
        }
      }

      particlesGeo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
      
      particlesMat = new THREE.PointsMaterial({
        color: isRain ? 0xa5f3fc : 0xffffff,
        size: isRain ? 0.08 : 0.25,
        transparent: true,
        opacity: isRain ? 0.7 : 0.9,
        depthWrite: false
      });

      particles = new THREE.Points(particlesGeo, particlesMat);
      scene.add(particles);
    }

    // Night stars background
    let stars: THREE.Points | null = null;
    if (!isDay) {
      const starGeo = new THREE.BufferGeometry();
      const starCount = 300;
      const starPositions = new Float32Array(starCount * 3);
      for (let i = 0; i < starCount; i++) {
        starPositions[i * 3] = (Math.random() - 0.5) * 60;
        starPositions[i * 3 + 1] = Math.random() * 20 + 5;
        starPositions[i * 3 + 2] = (Math.random() - 0.5) * 30 - 10;
      }
      starGeo.setAttribute("position", new THREE.BufferAttribute(starPositions, 3));
      const starMat = new THREE.PointsMaterial({
        color: 0xffffff,
        size: 0.12,
        transparent: true,
        opacity: 0.8
      });
      stars = new THREE.Points(starGeo, starMat);
      scene.add(stars);
    }

    // Sunrise / Sunset glow sphere
    let sunSphere: THREE.Mesh | null = null;
    if (isDay && !isThunderstorm) {
      const sunGeo = new THREE.SphereGeometry(1.8, 16, 16);
      const sunMat = new THREE.MeshBasicMaterial({
        color: temp > 30 ? 0xf59e0b : 0xfef08a,
        transparent: true,
        opacity: 0.95
      });
      sunSphere = new THREE.Mesh(sunGeo, sunMat);
      sunSphere.position.set(12, 8, -12);
      scene.add(sunSphere);
    }

    // Resize Observer to match container boundaries perfectly
    const handleResize = () => {
      const container = containerRef.current;
      if (!container || !renderer) return;
      const width = container.clientWidth;
      const height = container.clientHeight;

      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    };

    const resizeObserver = new ResizeObserver(() => handleResize());
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    // Initial resize trigger
    handleResize();

    // 3. Animation Loop
    let animationFrameId: number;
    let lastTime = 0;
    let lightningTimer = 0;

    const animate = (time: number) => {
      animationFrameId = requestAnimationFrame(animate);

      const delta = time - lastTime;
      lastTime = time;

      // Rotate and float clouds
      const driftSpeed = (windSpeed / 3600) * 0.1; // scale wind from km/h to rendering offsets
      cloudsGroup.position.x += driftSpeed * delta;
      if (cloudsGroup.position.x > 25) {
        cloudsGroup.position.x = -25;
      }

      // Slightly bob clouds up and down
      cloudsArray.forEach((c, index) => {
        c.position.y += Math.sin(time * 0.001 + index) * 0.002;
      });

      // Animate Rain/Snow Particles
      if (particles && particlesGeo) {
        const posAttr = particlesGeo.getAttribute("position") as THREE.BufferAttribute;
        const arr = posAttr.array as Float32Array;

        for (let i = 0; i < particleCount; i++) {
          // Update Y position
          arr[i * 3 + 1] += velocities[i * 3 + 1] * (delta * 0.05); // falling
          // Update X position with wind drift
          arr[i * 3] += (velocities[i * 3] + (windSpeed / 120)) * (delta * 0.03);

          // Reset if fallen below threshold
          if (arr[i * 3 + 1] < -12) {
            arr[i * 3 + 1] = 18;
            arr[i * 3] = (Math.random() - 0.5) * 40;
          }

          // Reset if drifted out of bounds sideways
          if (arr[i * 3] > 25 || arr[i * 3] < -25) {
            arr[i * 3] = (Math.random() - 0.5) * 40;
            arr[i * 3 + 1] = 18;
          }
        }
        posAttr.needsUpdate = true;
      }

      // Animate Night Stars glimmering
      if (stars) {
        const opacity = 0.5 + Math.sin(time * 0.003) * 0.3;
        (stars.material as THREE.PointsMaterial).opacity = opacity;
      }

      // Thunderstorm Lightning strike simulator
      if (isThunderstorm) {
        lightningTimer += delta;
        if (lightningTimer > Math.random() * 8000 + 4000) {
          lightningTimer = 0;
          // Strike! Fast flash
          scene.fog = new THREE.FogExp2(0xf1f5f9, 0.12); // bright flash
          setTimeout(() => {
            scene.fog = new THREE.FogExp2(fogColor, fogDensity); // restore
          }, 60);
          setTimeout(() => {
            scene.fog = new THREE.FogExp2(0xffffff, 0.1); // double strike
            setTimeout(() => {
              scene.fog = new THREE.FogExp2(fogColor, fogDensity);
            }, 50);
          }, 180);
        }
      }

      renderer.render(scene, camera);
    };

    animationFrameId = requestAnimationFrame(animate);

    // Cleanup
    return () => {
      cancelAnimationFrame(animationFrameId);
      resizeObserver.disconnect();
      if (renderer) {
        renderer.dispose();
      }
      // dispose geometry/materials
      cloudGeo.dispose();
      cloudMat.dispose();
      if (particlesGeo) particlesGeo.dispose();
      if (particlesMat) particlesMat.dispose();
    };
  }, [conditionCode, isDay, windSpeed, clouds, temp, graphicsMode]);

  return (
    <div
      ref={containerRef}
      id="weather-background"
      className={`absolute inset-0 w-full h-full -z-10 bg-gradient-to-br ${ambientTheme.bgGradient} overflow-hidden transition-all duration-1000`}
    >
      {/* Three.js Canvas */}
      {graphicsMode === "high" && webglSupported ? (
        <canvas ref={canvasRef} className="absolute inset-0 w-full h-full block" />
      ) : (
        /* Dynamic 2D Fallback Overlay */
        <div className="absolute inset-0 w-full h-full overflow-hidden pointer-events-none">
          {/* Subtle slow shifting cloud icons */}
          <div className="absolute top-12 left-0 w-full flex justify-around opacity-40 animate-pulse">
            <div className="w-48 h-12 bg-white rounded-full blur-xl filter animate-bounce [animation-duration:15s]" />
            <div className="w-64 h-16 bg-white rounded-full blur-xl filter animate-bounce [animation-duration:20s] delay-1000" />
            {clouds > 50 && (
              <div className="w-80 h-20 bg-slate-200 rounded-full blur-xl filter animate-bounce [animation-duration:25s] delay-2000" />
            )}
          </div>

          {/* Fallback CSS Falling Rain */}
          {ambientTheme.effectType === "rain" && (
            <div className="absolute inset-0 bg-black/10">
              <div className="rain-effect-css absolute inset-0 opacity-50 bg-[linear-gradient(rgba(165,243,252,0.25)_2px,transparent_2px)] bg-[size:3px_40px] animate-[slide_1.5s_linear_infinite]" />
            </div>
          )}

          {/* Fallback CSS Floating Snow */}
          {ambientTheme.effectType === "snow" && (
            <div className="absolute inset-0">
              <div className="snow-effect-css absolute inset-0 opacity-60 bg-[radial-gradient(circle_at_50%_50%,white_2px,transparent_2px)] bg-[size:25px_25px] animate-[slide_8s_linear_infinite]" />
            </div>
          )}

          {/* Fallback CSS Thunderstorm lightning */}
          {ambientTheme.effectType === "storm" && (
            <div className="absolute inset-0 bg-lightning-flash" />
          )}

          {/* Fallback CSS Thick fog overlay */}
          {ambientTheme.effectType === "fog" && (
            <div className="absolute inset-0 bg-white/10 backdrop-blur-[2px]" />
          )}

          {/* Night fallback stars */}
          {!isDay && (
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_30%,rgba(255,255,255,0.15)_1px,transparent_1px)] bg-[size:30px_30px]" />
          )}
        </div>
      )}

      {/* Global CSS Inject for 2D Particle slide animations and thunderstorm lightning */}
      <style>{`
        @keyframes slide {
          0% { transform: translateY(-100px) rotate(5deg); }
          100% { transform: translateY(100vh) rotate(5deg); }
        }
        @keyframes lightningStrike {
          0%, 95%, 98%, 100% { opacity: 0; }
          96%, 97% { opacity: 0.35; }
        }
        .bg-lightning-flash {
          animation: lightningStrike 6s ease-in-out infinite;
          background-color: #f1f5f9;
        }
      `}</style>
    </div>
  );
}
