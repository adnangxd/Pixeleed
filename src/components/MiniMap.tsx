import React from 'react';
import { motion } from 'motion/react';
import * as THREE from 'three';

interface MiniMapProps {
  trackPoints: THREE.Vector3[];
  p1Pos: THREE.Vector3;
  p2Pos: THREE.Vector3;
  p1Color: string;
  p2Color: string;
}

export const MiniMap: React.FC<MiniMapProps> = ({ trackPoints, p1Pos, p2Pos, p1Color, p2Color }) => {
  if (!trackPoints.length) return null;

  // Find bounds for normalization
  let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
  trackPoints.forEach(p => {
    minX = Math.min(minX, p.x);
    maxX = Math.max(maxX, p.x);
    minZ = Math.min(minZ, p.z);
    maxZ = Math.max(maxZ, p.z);
  });

  const width = maxX - minX;
  const height = maxZ - minZ;
  const maxDim = Math.max(width, height);
  const scale = 150 / (maxDim || 1); // 150px mini map size

  const normalize = (p: THREE.Vector3) => ({
    x: (p.x - minX) * scale + (150 - width * scale) / 2,
    y: (p.z - minZ) * scale + (150 - height * scale) / 2,
  });

  const p1 = normalize(p1Pos);
  const p2 = normalize(p2Pos);

  return (
    <div className="relative w-[180px] h-[180px] group">
      {/* High-tech border */}
      <div className="absolute inset-0 rounded-full border-4 border-slate-700/50 bg-slate-900/90 backdrop-blur-xl shadow-[0_0_30px_rgba(0,0,0,0.8)]" />
      <div className="absolute inset-2 rounded-full border border-blue-500/30" />
      <div className="absolute inset-0 rounded-full border-2 border-t-blue-500/50 border-r-transparent border-b-transparent border-l-transparent animate-spin-slow pointer-events-none" />
      
      <div className="relative w-full h-full flex items-center justify-center pointer-events-none">
        <svg width="150" height="150" viewBox="0 0 150 150" className="overflow-visible">
          <defs>
            <filter id="glow">
                <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
                <feMerge>
                    <feMergeNode in="coloredBlur"/>
                    <feMergeNode in="SourceGraphic"/>
                </feMerge>
            </filter>
          </defs>
          
          {/* Track Path */}
          <polyline
            points={trackPoints.map(p => {
                const n = normalize(p);
                return `${n.x},${n.y}`;
            }).join(' ')}
            fill="none"
            stroke="rgba(56, 189, 248, 0.2)"
            strokeWidth="10"
            strokeLinejoin="round"
          />
          <polyline
            points={trackPoints.map(p => {
                const n = normalize(p);
                return `${n.x},${n.y}`;
            }).join(' ')}
            fill="none"
            stroke="#1e293b"
            strokeWidth="6"
            strokeLinejoin="round"
          />
          <polyline
            points={trackPoints.map(p => {
                const n = normalize(p);
                return `${n.x},${n.y}`;
            }).join(' ')}
            fill="none"
            stroke="white"
            strokeWidth="1.5"
            strokeDasharray="4 4"
            strokeLinejoin="round"
            style={{ filter: 'url(#glow)' }}
          />

          {/* Start Line Marker */}
          <circle cx={normalize(trackPoints[0]).x} cy={normalize(trackPoints[0]).y} r="4" fill="#fbbf24" stroke="black" strokeWidth="1" />

          {/* Players */}
          <motion.circle
            cx={p2.x}
            cy={p2.y}
            r="6"
            fill={p2Color}
            stroke="white"
            strokeWidth="2"
            initial={false}
            animate={{ cx: p2.x, cy: p2.y }}
            style={{ filter: 'url(#glow)' }}
          />
          <motion.circle
            cx={p1.x}
            cy={p1.y}
            r="6"
            fill={p1Color}
            stroke="white"
            strokeWidth="2"
            initial={false}
            animate={{ cx: p1.x, cy: p1.y }}
            style={{ filter: 'url(#glow)' }}
          />
        </svg>
      </div>
      
      {/* Corner accents */}
      <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-blue-400/50 rounded-tl-lg" />
      <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-blue-400/50 rounded-tr-lg" />
      <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-blue-400/50 rounded-bl-lg" />
      <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-blue-400/50 rounded-br-lg" />
    </div>
  );
};
