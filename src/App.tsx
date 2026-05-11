import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { motion, AnimatePresence } from 'motion/react';
import { Trophy, Play, Keyboard, Settings, Info, ArrowLeft, RotateCcw, User, Users, ChevronUp, ChevronDown, ChevronLeft, ChevronRight, Zap, Settings2 } from 'lucide-react';
import { GameManager } from './game/GameManager';
import { PlayerStats, PowerUpType, POWERUP_ICONS, GameMode, AIDifficulty } from './constants';
import { MiniMap } from './components/MiniMap';

type GameState = 'MENU' | 'INSTRUCTIONS' | 'MODE_SELECT' | 'DIFFICULTY_SELECT' | 'TRACK_SELECT' | 'PLAYING' | 'PAUSED' | 'GAME_OVER';

const TRACKS = [
  { id: 0, name: 'Forest Run', color: '#228B22', description: 'Classic woodland circuit.' },
  { id: 1, name: 'Desert Dash', color: '#d2b48c', description: 'Curvy dunes under the sun.' },
  { id: 2, name: 'Neon City', color: '#111122', description: 'High-speed urban square.' },
];

export default function App() {
  const [gameState, setGameState] = useState<GameState>('MENU');
  const [mode, setMode] = useState<GameMode>(GameMode.MULTIPLAYER);
  const [usePowerUps, setUsePowerUps] = useState(true);
  const [totalLaps, setTotalLaps] = useState(3);
  const [aiDifficulty, setAIDifficulty] = useState<AIDifficulty>(AIDifficulty.NORMAL);
  const [trackId, setTrackId] = useState(0);
  const [winner, setWinner] = useState<number | null>(null);
  const [p1Stats, setP1Stats] = useState<PlayerStats | null>(null);
  const [p2Stats, setP2Stats] = useState<PlayerStats | null>(null);
  const [trackPoints, setTrackPoints] = useState<THREE.Vector3[]>([]);
  const [p1Pos, setP1Pos] = useState<THREE.Vector3>(new THREE.Vector3());
  const [p2Pos, setP2Pos] = useState<THREE.Vector3>(new THREE.Vector3());
  const [isMobile, setIsMobile] = useState(false);
  const [isPortrait, setIsPortrait] = useState(false);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameManagerRef = useRef<GameManager | null>(null);

  useEffect(() => {
    const checkViewport = () => {
      const mobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth < 1024;
      setIsMobile(mobile);
      setIsPortrait(window.innerHeight > window.innerWidth);
      if (mobile) setMode(GameMode.SINGLE_PLAYER);
    };
    checkViewport();
    window.addEventListener('resize', checkViewport);
    window.addEventListener('orientationchange', checkViewport);
    return () => {
      window.removeEventListener('resize', checkViewport);
      window.removeEventListener('orientationchange', checkViewport);
    };
  }, []);

  useEffect(() => {
    let rafId: number;
    let timeoutId: any;

    const start = () => {
      const canvas = canvasRef.current;
      if (gameState === 'PLAYING' && canvas) {
        const width = window.innerWidth;
        const height = window.innerHeight;
        
        if (width <= 0 || height <= 0) {
            timeoutId = setTimeout(start, 50);
            return;
        }

        const gm = new GameManager(canvas, trackId, mode, aiDifficulty, usePowerUps, totalLaps);
        gameManagerRef.current = gm;
        setTrackPoints(gm.track.points);

        const loop = () => {
          if (!gameManagerRef.current) return;
          gm.update();
          
          setP1Stats({ ...gm.p1.stats });
          setP2Stats({ ...gm.p2.stats });
          setP1Pos(gm.p1.mesh.position.clone());
          setP2Pos(gm.p2.mesh.position.clone());

          if (gm.isGameOver) {
            setWinner(gm.winner);
            setGameState('GAME_OVER');
            return;
          }
          rafId = requestAnimationFrame(loop);
        };
        rafId = requestAnimationFrame(loop);

        const handleResize = () => {
          if (gameManagerRef.current) {
            const w = window.innerWidth;
            const h = window.innerHeight;
            gameManagerRef.current.renderer.setSize(w, h);
            if (mode === GameMode.MULTIPLAYER) {
                gameManagerRef.current.p1Camera.aspect = (w / 2) / h;
                if (gameManagerRef.current.p2Camera) {
                    gameManagerRef.current.p2Camera.aspect = (w / 2) / h;
                    gameManagerRef.current.p2Camera.updateProjectionMatrix();
                }
            } else {
                gameManagerRef.current.p1Camera.aspect = w / h;
            }
            gameManagerRef.current.p1Camera.updateProjectionMatrix();
          }
        };

        const handleKeyDown = (e: KeyboardEvent) => {
          if (e.code === 'Escape') {
            setGameState(prev => {
              if (prev === 'PLAYING') {
                if (gameManagerRef.current) gameManagerRef.current.isPaused = true;
                return 'PAUSED';
              }
              if (prev === 'PAUSED') {
                if (gameManagerRef.current) gameManagerRef.current.isPaused = false;
                return 'PLAYING';
              }
              return prev;
            });
          }
        };

        window.addEventListener('resize', handleResize);
        window.addEventListener('keydown', handleKeyDown);

        return () => {
          if (rafId) cancelAnimationFrame(rafId);
          if (timeoutId) clearTimeout(timeoutId);
          window.removeEventListener('resize', handleResize);
          window.removeEventListener('keydown', handleKeyDown);
          if (gameManagerRef.current) {
            gameManagerRef.current.dispose();
            gameManagerRef.current = null;
          }
        };
      }
    };

    if (gameState === 'PLAYING') {
        const checkReady = () => {
          if (canvasRef.current) {
            start();
          } else {
            timeoutId = setTimeout(checkReady, 50);
          }
        };
        checkReady();
    }

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      if (gameManagerRef.current) {
        gameManagerRef.current.dispose();
        gameManagerRef.current = null;
      }
    };
  }, [gameState, trackId, mode]);

  return (
    <div className="fixed inset-0 w-full h-full bg-slate-950 text-slate-50 font-sans overflow-hidden select-none flex flex-col">
      <AnimatePresence>
        {isMobile && isPortrait && (
          <motion.div 
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] bg-slate-950 flex flex-col items-center justify-center p-8 text-center"
          >
            <motion.div
              animate={{ rotate: [0, 90, 0] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              className="mb-8"
            >
              <RotateCcw size={64} className="text-arcade-blue" />
            </motion.div>
            <h2 className="text-3xl font-black uppercase italic tracking-tighter text-white mb-4">Rotate Your Device</h2>
            <p className="text-slate-400 font-medium max-w-sm">Please turn your device sideways to landscape mode to play Pixeleed.</p>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex-1 relative overflow-hidden">
        <AnimatePresence mode="wait">
          {gameState === 'MENU' && (
            <motion.div 
              key="menu"
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, scale: 1.1, filter: "blur(20px)" }}
              className="flex flex-col items-center justify-center h-full relative overflow-hidden"
            >
            {/* Background decorative elements */}
            <div className="absolute inset-0 opacity-20 pointer-events-none">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,#3b82f6_0%,transparent_70%)]" />
                <div className="w-full h-full" style={{ backgroundImage: 'linear-gradient(rgba(59,130,246,0.1) 1px,transparent 1px),linear-gradient(90deg,rgba(59,130,246,0.1) 1px,transparent 1px)', backgroundSize: '60px 60px' }} />
                <motion.div 
                    animate={{ rotate: 360 }}
                    transition={{ duration: 60, repeat: Infinity, ease: "linear" }}
                    className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] border border-white/5 rounded-full"
                />
            </div>

            <div className="flex flex-col items-center gap-4 mb-16 z-10">
                <motion.div 
                    initial={{ scale: 0, rotate: -45 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: "spring", damping: 12 }}
                    className="w-24 h-24 bg-gradient-to-br from-arcade-blue to-arcade-purple rounded-3xl shadow-[0_0_40px_rgba(59,130,246,0.5)] flex items-center justify-center mb-6 relative group"
                >
                    <Trophy className="text-white w-12 h-12" />
                    <div className="absolute inset-0 bg-white opacity-20 rounded-3xl blur-xl group-hover:opacity-40 transition-opacity" />
                </motion.div>
                
                <div className="relative">
                    <motion.h1 
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        className="text-8xl font-black tracking-tighter uppercase italic text-transparent clip-text bg-gradient-to-b from-white via-white to-slate-500 drop-shadow-2xl"
                    >
                        PIXELEED
                    </motion.h1>
                    <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: "100%" }}
                        transition={{ delay: 0.5, duration: 0.8 }}
                        className="h-2 bg-gradient-to-r from-arcade-blue via-arcade-purple to-arcade-rose rounded-full mt-2"
                    />
                </div>
            </div>

            <motion.div 
                initial={{ y: 40, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="flex flex-col gap-6 w-80 z-10"
            >
                <MenuButton icon={<Play size={24}/>} onClick={() => setGameState(isMobile ? 'TRACK_SELECT' : 'MODE_SELECT')} label="New Race" primary />
                <MenuButton icon={<Keyboard size={24}/>} onClick={() => setGameState('INSTRUCTIONS')} label="How to Play" />
            </motion.div>
            
            <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1 }}
                className="absolute bottom-10 flex gap-8 items-center text-slate-500 text-[10px] font-black uppercase tracking-[0.3em]"
            >
                <span>© 2026 PIXELEED STUDIOS</span>
                <div className="w-1 h-1 bg-slate-800 rounded-full" />
                <span>V1.4.0 ARCADE EDITION</span>
            </motion.div>
          </motion.div>
        )}

        {gameState === 'MODE_SELECT' && (
          <motion.div 
            key="mode"
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -100 }}
            className="flex flex-col items-center justify-center h-full p-8 relative overflow-hidden"
          >
            <div className="flex flex-col items-center gap-2 mb-16 z-10 text-center">
                <h2 className="text-6xl font-black uppercase italic tracking-tighter text-transparent clip-text bg-gradient-to-b from-white to-slate-500">Race Config</h2>
                <div className="h-1 w-24 bg-arcade-blue rounded-full" />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10 w-full max-w-5xl mb-12 z-10">
                {[
                    { id: GameMode.SINGLE_PLAYER, icon: <User size={48} />, label: "Solo vs Bot", color: "blue" },
                    { id: GameMode.MULTIPLAYER, icon: <Users size={48} />, label: "Local Split-Screen", color: "rose", disabled: isMobile }
                ].map(item => (
                    <motion.button 
                      key={item.id}
                      whileHover={item.disabled ? {} : { scale: 1.02, y: -5 }}
                      whileTap={item.disabled ? {} : { scale: 0.98 }}
                      disabled={item.disabled}
                      onPointerDown={(e) => { if (!item.disabled) { e.preventDefault(); setMode(item.id as GameMode); } }}
                      className={`p-10 rounded-[2.5rem] border-4 transition-all flex flex-col items-center gap-6 relative overflow-hidden ${
                          mode === item.id 
                          ? `bg-arcade-${item.color}/20 border-arcade-${item.color} shadow-[0_0_40px_rgba(0,0,0,0.3)]` 
                          : 'bg-slate-900 border-slate-800 hover:border-slate-700'
                      } ${item.disabled ? 'opacity-20 grayscale cursor-not-allowed' : ''}`}
                    >
                        <div className={`${mode === item.id ? `text-arcade-${item.color}` : 'text-slate-600'} transition-colors`}>{item.icon}</div>
                        <h3 className="text-3xl font-black uppercase italic tracking-tighter">{item.label}</h3>
                        {item.disabled && <span className="absolute bottom-4 text-[10px] font-black uppercase tracking-widest text-slate-500">Mobile Restricted</span>}
                        {mode === item.id && (
                            <motion.div layoutId="mode-glow" className={`absolute -inset-4 bg-arcade-${item.color}/10 blur-2xl -z-10`} />
                        )}
                    </motion.button>
                ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full max-w-5xl mb-16 z-10">
                {/* Chaos Mode Toggle */}
                <div className="glass p-8 rounded-[2rem] flex flex-col justify-between gap-4">
                    <div className="flex flex-col">
                        <span className="text-arcade-blue font-black uppercase text-[10px] tracking-[0.2em] mb-1">Chaos Mode</span>
                        <span className="text-xl font-bold italic uppercase leading-none">Power-Ups</span>
                    </div>
                    <button 
                        onClick={() => setUsePowerUps(!usePowerUps)}
                        className={`w-full h-12 rounded-2xl relative transition-colors border-2 ${usePowerUps ? 'bg-arcade-blue/20 border-arcade-blue' : 'bg-slate-950 border-slate-800'}`}
                    >
                        <div className="flex items-center justify-between px-4 h-full">
                            <span className={`text-[10px] font-black uppercase ${!usePowerUps ? 'text-white' : 'text-slate-600'}`}>Off</span>
                            <span className={`text-[10px] font-black uppercase ${usePowerUps ? 'text-white' : 'text-slate-600'}`}>On</span>
                        </div>
                        <motion.div 
                            animate={{ x: usePowerUps ? "calc(100% - 40px)" : "4px" }}
                            className="absolute top-1 left-0 w-9 h-9 bg-white rounded-xl shadow-xl flex items-center justify-center p-2"
                        >
                            <Zap size={16} className={usePowerUps ? "text-arcade-blue" : "text-slate-400"} />
                        </motion.div>
                    </button>
                </div>

                {/* Lap Select */}
                <div className="glass p-8 rounded-[2rem] flex flex-col gap-4">
                    <div className="flex flex-col">
                        <span className="text-arcade-amber font-black uppercase text-[10px] tracking-[0.2em] mb-1">Race Duration</span>
                        <span className="text-xl font-bold italic uppercase leading-none">Total Laps</span>
                    </div>
                    <div className="flex gap-2">
                        {[3, 5, 10].map(l => (
                            <button 
                                key={l}
                                onClick={() => setTotalLaps(l)}
                                className={`flex-1 h-12 rounded-xl font-black transition-all border-2 text-[11px] uppercase tracking-tighter ${totalLaps === l ? 'bg-arcade-amber border-amber-300 text-slate-950 shadow-lg' : 'bg-slate-950 border-slate-800 text-slate-500'}`}
                            >
                                {l} Laps
                            </button>
                        ))}
                    </div>
                </div>

                {/* AI Difficulty */}
                <div className="glass p-8 rounded-[2rem] flex flex-col gap-4">
                    <div className="flex flex-col">
                        <span className="text-arcade-emerald font-black uppercase text-[10px] tracking-[0.2em] mb-1">CPU Challenge</span>
                        <span className="text-xl font-bold italic uppercase leading-none">AI Level</span>
                    </div>
                    <div className="flex gap-2">
                        {Object.values(AIDifficulty).map(d => (
                            <button 
                                key={d}
                                onClick={() => setAIDifficulty(d)}
                                className={`flex-1 h-12 rounded-xl text-[10px] font-black uppercase tracking-tighter border-2 transition-all ${aiDifficulty === d ? 'bg-arcade-emerald border-emerald-300 text-slate-950 shadow-lg' : 'bg-slate-950 border-slate-800 text-slate-600'}`}
                            >
                                {d}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <div className="flex gap-6 z-10">
                <MenuButton icon={<ArrowLeft size={24}/>} label="Back" onClick={() => setGameState('MENU')} />
                <MenuButton icon={<Play size={24}/>} label="Pick Track" onClick={() => setGameState('TRACK_SELECT')} primary />
            </div>
          </motion.div>
        )}

        {gameState === 'TRACK_SELECT' && (
           <motion.div 
           key="track"
           initial={{ opacity: 0, y: 100 }}
           animate={{ opacity: 1, y: 0 }}
           exit={{ opacity: 0, y: -100 }}
           className="flex flex-col items-center justify-center h-full p-8 overflow-y-auto"
         >
            <div className="flex flex-col items-center gap-2 mb-8 z-10 text-center">
                <h2 className="text-6xl font-black uppercase italic tracking-tighter text-transparent clip-text bg-gradient-to-b from-white to-slate-500">Track Select</h2>
                <div className="h-1 w-24 bg-arcade-amber rounded-full" />
            </div>

           <div className="grid grid-cols-1 md:grid-cols-3 gap-10 w-full max-w-6xl z-10">
             {TRACKS.map((t, i) => (
               <motion.div
                 key={t.id}
                 initial={{ opacity: 0, y: 30 }}
                 animate={{ opacity: 1, y: 0 }}
                 transition={{ delay: i * 0.1 }}
                 whileHover={{ scale: 1.05, y: -10 }}
                 onPointerDown={(e) => { 
                    e.preventDefault();
                    setTrackId(t.id); 
                    setGameState('PLAYING'); 
                 }}
                 className="group relative flex flex-col bg-slate-900 rounded-[2.5rem] border-4 border-slate-800 overflow-hidden cursor-pointer hover:border-arcade-amber transition-all shadow-2xl active:scale-95"
               >
                 <div className="w-full h-56 relative overflow-hidden flex items-center justify-center" style={{ backgroundColor: t.color }}>
                    <div className="absolute inset-0 bg-black/10 mix-blend-overlay" />
                    <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_center,#ffffff_0%,transparent_70%)] group-hover:scale-150 transition-transform duration-1000" />
                    <Trophy size={80} className="text-white opacity-10 rotate-12" />
                 </div>
                 
                 <div className="p-8 flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">Circuit 0{t.id + 1}</span>
                        <div className="w-2 h-2 rounded-full bg-arcade-amber" />
                    </div>
                    <h3 className="text-3xl font-black uppercase italic tracking-tighter group-hover:text-arcade-amber transition-colors">{t.name}</h3>
                    <p className="text-slate-400 text-sm leading-relaxed font-medium">{t.description}</p>
                 </div>
                 
                 {/* Selection Overlay */}
                 <div className="absolute inset-0 bg-arcade-amber/10 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity" />
               </motion.div>
             ))}
           </div>

           <motion.button 
             initial={{ opacity: 0 }}
             animate={{ opacity: 1 }}
             transition={{ delay: 0.5 }}
             onClick={() => setGameState('MODE_SELECT')} 
             className="mt-16 flex items-center gap-3 text-slate-500 hover:text-white transition-colors p-4 uppercase text-xs font-black tracking-[0.4em] glass rounded-2xl"
           >
              <ArrowLeft size={16}/> Back to settings
           </motion.button>
         </motion.div>
        )}

        {gameState === 'INSTRUCTIONS' && (
          <motion.div 
            key="instructions"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center h-full p-8"
          >
            <div className="grid grid-cols-2 gap-16 max-w-4xl">
                <div className="space-y-6">
                    <h3 className="text-3xl font-bold text-red-500 uppercase italic">Player 1 (Right Screen)</h3>
                    <div className="flex flex-col gap-4">
                        <ControlRow keys="↑ ↓ ← →" action="Movement" />
                        <ControlRow keys="Shift" action="Drift" />
                        <ControlRow keys="/" action="Use Power-up" />
                    </div>
                </div>
                <div className="space-y-6">
                    <h3 className="text-3xl font-bold text-blue-500 uppercase italic">Player 2 (Left Screen)</h3>
                    <div className="flex flex-col gap-4">
                        <ControlRow keys="W A S D" action="Movement" />
                        <ControlRow keys="Space" action="Drift" />
                        <ControlRow keys="Q" action="Use Power-up" />
                    </div>
                </div>
            </div>
            <button onClick={() => setGameState('MENU')} className="mt-16 flex items-center gap-2 text-neutral-400 hover:text-white transition-colors">
              <ArrowLeft size={18}/> Back to menu
            </button>
          </motion.div>
        )}

        {gameState === 'PLAYING' && (
            <div key="playing" className="relative w-full h-full border-4 border-slate-800">
                <canvas ref={canvasRef} className="w-full h-full block" />
                
                {/* HUD Overlay */}
                <div className="absolute inset-0 pointer-events-none flex">
                    {mode === GameMode.MULTIPLAYER ? (
                        <>
                            {/* P2 (Left) */}
                            <div className="w-1/2 h-full flex flex-col items-start justify-between p-10 border-r-2 border-white/5 relative">
                                <HUD player={2} stats={p2Stats} color="text-[#38bdf8]" side="left" />
                                {p2Stats?.isWrongWay && <WrongWayWarning timer={p2Stats.wrongWayTimer} />}
                            </div>
                            {/* P1 (Right) */}
                            <div className="w-1/2 h-full flex flex-col items-end justify-between p-10 relative">
                                <HUD player={1} stats={p1Stats} color="text-[#f87171]" side="right" />
                                {p1Stats?.isWrongWay && <WrongWayWarning timer={p1Stats.wrongWayTimer} />}
                            </div>
                        </>
                    ) : (
                        <div className="w-full h-full flex flex-col items-end justify-between p-10 relative">
                            <HUD player={1} stats={p1Stats} color="text-[#f87171]" side="right" />
                            {p1Stats?.isWrongWay && <WrongWayWarning timer={p1Stats.wrongWayTimer} />}
                        </div>
                    )}
                </div>

                <div className={`absolute z-30 pointer-events-none transition-all duration-700 ease-out ${mode === GameMode.SINGLE_PLAYER ? 'bottom-8 left-8 scale-90' : 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2'}`}>
                    <MiniMap 
                        trackPoints={trackPoints} 
                        p1Pos={p1Pos} 
                        p2Pos={p2Pos} 
                        p1Color="#f87171" 
                        p2Color="#38bdf8" 
                    />
                </div>
                
                {mode === GameMode.MULTIPLAYER && (
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[4px] h-full split-line-gradient z-20 opacity-50 pointer-events-none shadow-[0_0_20px_rgba(0,0,0,0.5)]" />
                )}
                
                <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-black/40 to-transparent pointer-events-none" />
                
                {isMobile && (
                  <TouchControls gm={gameManagerRef.current} onPause={() => {
                    setGameState('PAUSED');
                    if (gameManagerRef.current) gameManagerRef.current.setPaused(true);
                  }} />
                )}
            </div>
        )}

        {gameState === 'PAUSED' && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 z-[100] flex items-center justify-center bg-slate-950/80 backdrop-blur-xl"
          >
            <motion.div 
              initial={{ scale: 0.8, y: 50 }}
              animate={{ scale: 1, y: 0 }}
              className="glass-dark border-white/10 p-16 rounded-[4rem] shadow-[0_0_100px_rgba(0,0,0,0.8)] flex flex-col items-center gap-12 min-w-[500px] relative overflow-hidden"
            >
              <div className="absolute top-0 inset-x-0 h-2 bg-gradient-to-r from-arcade-blue via-arcade-purple to-arcade-rose" />
              
              <div className="flex flex-col items-center gap-2">
                  <motion.h2 
                    animate={{ scale: [1, 1.05, 1] }}
                    transition={{ repeat: Infinity, duration: 2 }}
                    className="text-8xl font-black italic uppercase tracking-tighter text-transparent clip-text bg-gradient-to-b from-white to-slate-500 drop-shadow-glow"
                  >
                    Paused
                  </motion.h2>
                  <p className="text-arcade-blue font-black uppercase tracking-[0.4em] text-xs">Race is currently suspended</p>
              </div>
              
              <div className="flex flex-col gap-6 w-full">
                <MenuButton 
                   icon={<Play size={28} />} 
                   label="Resume Race" 
                   onClick={() => {
                     setGameState('PLAYING');
                     if (gameManagerRef.current) gameManagerRef.current.setPaused(false);
                   }} 
                   primary 
                />
                <div className="grid grid-cols-2 gap-4">
                    <MenuButton 
                        icon={<RotateCcw size={20} />} 
                        label="Restart" 
                        onClick={() => {
                            if (gameManagerRef.current) gameManagerRef.current.dispose();
                            setGameState('MENU');
                            setTimeout(() => {
                                setTrackId(trackId); // maintain current track
                                setGameState('PLAYING');
                            }, 100);
                        }} 
                    />
                    <MenuButton 
                        icon={<ArrowLeft size={20} />} 
                        label="Quit" 
                        onClick={() => setGameState('MENU')} 
                    />
                </div>
              </div>

              <div className="flex items-center gap-4 text-slate-500 text-[10px] font-black uppercase tracking-[0.3em] glass px-6 py-3 rounded-full">
                <kbd className="bg-white/10 px-2 py-1 rounded-lg border border-white/10 text-white font-mono">ESC</kbd> 
                <span>to quick resume</span>
              </div>
            </motion.div>
          </motion.div>
        )}

        {gameState === 'GAME_OVER' && (
          <motion.div 
            key="game-over"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center h-full relative overflow-hidden"
          >
            {/* Confetti-like background particles could go here */}
            
            <motion.div 
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", damping: 15 }}
                className={`w-40 h-40 rounded-[3rem] shadow-2xl flex items-center justify-center mb-8 relative ${winner === 1 ? 'bg-arcade-rose' : 'bg-arcade-blue'}`}
            >
                <Trophy size={80} className="text-white drop-shadow-2xl" />
                <motion.div 
                    animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0, 0.5] }}
                    transition={{ repeat: Infinity, duration: 2 }}
                    className="absolute inset-0 bg-white rounded-[3rem] blur-2xl"
                />
            </motion.div>

            <motion.div 
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="flex flex-col items-center text-center mb-16"
            >
                <h2 className="text-8xl font-black mb-4 uppercase italic tracking-tighter text-transparent clip-text bg-gradient-to-b from-white to-slate-500">
                    Winner: Racer {String(winner).padStart(2, '0')}
                </h2>
                <p className="text-2xl text-slate-400 font-medium tracking-wide">Excellent performance on the track!</p>
            </motion.div>

            <motion.div 
                initial={{ y: 40, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="flex gap-6"
            >
                <MenuButton icon={<RotateCcw size={24}/>} label="Rematch" onClick={() => setGameState('PLAYING')} primary />
                <MenuButton icon={<ArrowLeft size={24}/>} label="Main Menu" onClick={() => setGameState('MENU')} />
            </motion.div>
            
            {/* Stats Summary could go here */}
          </motion.div>
        )}
      </AnimatePresence>
      </div>
    </div>
  );
}

function WrongWayWarning({ timer }: { timer: number }) {
    return (
        <motion.div 
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: [0, 1, 0], scale: 1 }}
            transition={{ repeat: Infinity, duration: 0.6 }}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 pointer-events-none"
        >
            <div className="bg-arcade-rose text-white px-12 py-6 rounded-3xl shadow-[0_0_50px_rgba(244,63,94,0.6)] border-4 border-white flex flex-col items-center gap-2 skew-slanted">
                <div className="skew-slanted-reverse flex flex-col items-center">
                    <span className="text-6xl font-black italic tracking-tighter uppercase leading-none">Wrong Way!</span>
                    <span className="text-xl font-bold uppercase tracking-[0.3em] opacity-80">Resetting in {Math.ceil(timer)}s</span>
                </div>
            </div>
        </motion.div>
    );
}

function MenuButton({ icon, label, onClick, primary = false }: { icon: React.ReactNode, label: string, onClick: () => void, primary?: boolean }) {
    return (
        <motion.button
            whileHover={{ scale: 1.05, x: 10 }}
            whileTap={{ scale: 0.95 }}
            onPointerDown={(e) => { e.preventDefault(); onClick(); }}
            className={`group relative flex items-center justify-center gap-4 px-10 py-6 rounded-2xl font-black uppercase tracking-tighter transition-all skew-slanted ${
                primary 
                ? "bg-arcade-blue text-white shadow-[0_8px_0_#1d4ed8] hover:shadow-[0_12px_0_#1d4ed8] hover:-translate-y-1 active:translate-y-1 active:shadow-none" 
                : "bg-slate-800/40 backdrop-blur-md text-slate-200 border-2 border-white/10 hover:bg-slate-700/60 hover:border-arcade-blue/50"
            }`}
        >
            <div className="skew-slanted-reverse flex items-center gap-4">
                <span className={primary ? "text-white" : "text-arcade-blue"}>{icon}</span>
                <span className="text-xl italic">{label}</span>
            </div>
            {primary && (
                <div className="absolute -inset-2 bg-arcade-blue/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl -z-10" />
            )}
        </motion.button>
    )
}

function ControlRow({ keys, action }: { keys: string, action: string }) {
    return (
        <div className="flex items-center justify-between gap-12 glass p-6 rounded-3xl border-white/5 shadow-2xl skew-slanted">
            <div className="skew-slanted-reverse flex flex-col">
                <span className="text-arcade-blue font-black uppercase text-[10px] tracking-[0.2em] mb-1">Function</span>
                <span className="text-white font-bold italic uppercase leading-none">{action}</span>
            </div>
            <div className="flex gap-3 skew-slanted-reverse">
                {keys.split(' ').map((key, i) => (
                    <span key={i} className="min-w-[48px] h-12 flex items-center justify-center bg-slate-900 border-2 border-slate-700 border-b-8 border-b-slate-950 rounded-xl font-mono font-black text-arcade-blue text-lg shadow-lg">
                        {key}
                    </span>
                ))}
            </div>
        </div>
    )
}

function TouchControls({ gm, onPause }: { gm: GameManager | null, onPause: () => void }) {
    if (!gm) return null;

    const Button = ({ icon, onPress, onRelease, className }: { icon: React.ReactNode, onPress: () => void, onRelease: () => void, className: string }) => (
        <motion.button 
            whileTap={{ scale: 0.85 }}
            onPointerDown={(e) => { 
                try {
                    e.currentTarget.setPointerCapture(e.pointerId); 
                } catch (err) {}
                onPress(); 
            }}
            onPointerUp={(e) => { 
                try {
                    e.currentTarget.releasePointerCapture(e.pointerId); 
                } catch (err) {}
                onRelease(); 
            }}
            onPointerCancel={() => onRelease()}
            className={`w-24 h-24 rounded-[2.5rem] flex items-center justify-center text-white border-b-[10px] shadow-2xl select-none touch-none outline-none transition-shadow hover:brightness-110 ${className}`}
        >
            {icon}
        </motion.button>
    );

    return (
        <div className="absolute inset-0 z-[60] flex flex-col justify-between p-10 pt-[calc(2.5rem+env(safe-area-inset-top))] pb-[calc(2.5rem+env(safe-area-inset-bottom))] px-[calc(2.5rem+env(safe-area-inset-left))] pointer-events-none select-none touch-none">
            {/* Top Bar */}
            <div className="flex justify-between items-start pointer-events-auto">
                <button 
                    onClick={onPause}
                    className="w-16 h-16 rounded-[1.5rem] glass-dark flex items-center justify-center text-white shadow-2xl active:scale-90 transition-transform"
                >
                    <Settings2 size={32} />
                </button>

                <div className="flex gap-6">
                    <Button 
                        icon={<Zap size={40} />} 
                        onPress={() => gm.useP1PowerUp()} 
                        onRelease={() => {}}
                        className="bg-arcade-amber border-amber-800 shadow-amber-900/50" 
                    />
                    <Button 
                        icon={<div className="font-black italic text-sm tracking-tighter">DRIFT</div>} 
                        onPress={() => gm.setP1Control('drift', true)} 
                        onRelease={() => gm.setP1Control('drift', false)}
                        className="bg-arcade-purple border-purple-900 shadow-purple-950/50" 
                    />
                </div>
            </div>

            {/* Bottom Controls */}
            <div className="flex justify-between items-end mb-6 pr-[env(safe-area-inset-right)]">
                {/* Steering */}
                <div className="flex gap-8 pointer-events-auto pl-[env(safe-area-inset-left)]">
                    <Button 
                        icon={<ChevronLeft size={56} />} 
                        onPress={() => gm.setP1Control('left', true)} 
                        onRelease={() => gm.setP1Control('left', false)}
                        className="glass-dark border-slate-950" 
                    />
                    <Button 
                        icon={<ChevronRight size={56} />} 
                        onPress={() => gm.setP1Control('right', true)} 
                        onRelease={() => gm.setP1Control('right', false)}
                        className="glass-dark border-slate-950" 
                    />
                </div>

                {/* Pedals */}
                <div className="flex gap-8 pointer-events-auto">
                    <Button 
                        icon={<ChevronDown size={56} />} 
                        onPress={() => gm.setP1Control('backward', true)} 
                        onRelease={() => gm.setP1Control('backward', false)}
                        className="bg-arcade-rose border-rose-900 shadow-rose-950/50" 
                    />
                    <Button 
                        icon={<ChevronUp size={56} />} 
                        onPress={() => gm.setP1Control('forward', true)} 
                        onRelease={() => gm.setP1Control('forward', false)}
                        className="bg-arcade-emerald border-emerald-900 shadow-emerald-950/50" 
                    />
                </div>
            </div>
        </div>
    );
}

function HUD({ player, stats, color, side }: { player: number, stats: PlayerStats | null, color: string, side: 'left' | 'right' }) {
    if (!stats) return null;

    const speedKmh = Math.floor(stats.speed * 200);

    return (
        <>
            <motion.div 
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="flex items-center gap-8 glass-dark p-6 rounded-[2rem] border-white/10 shadow-2xl backdrop-blur-2xl"
            >
                <div className="flex flex-col items-center">
                    <span className="text-[10px] text-slate-500 uppercase font-black tracking-widest mb-1">Racer</span>
                    <div className={`text-5xl font-black italic tracking-tighter leading-none ${color}`}>
                        {String(player).padStart(2, '0')}
                    </div>
                </div>
                <div className="h-12 w-[1px] bg-white/10" />
                <div className="flex flex-col items-center">
                    <span className="text-[10px] text-slate-500 uppercase font-black tracking-widest mb-1 text-center">Lap</span>
                    <div className="text-4xl font-display font-black leading-none flex items-baseline gap-1">
                        <span className={color}>{String(Math.min(stats.lap, stats.totalLaps)).padStart(2, '0')}</span> 
                        <span className="text-slate-600 text-lg italic">/</span> 
                        <span className="text-slate-400 text-2xl">{String(stats.totalLaps).padStart(2, '0')}</span>
                    </div>
                </div>
                
                <div className="h-12 w-[1px] bg-white/10" />
                <div className={`w-14 h-14 rounded-2xl bg-black/40 border-2 flex items-center justify-center relative transition-all overflow-hidden ${stats.currentPowerUp ? 'border-arcade-amber shadow-[0_0_25px_rgba(245,158,11,0.4)]' : 'border-white/10'}`}>
                    {stats.currentPowerUp ? (
                        <motion.div 
                            initial={{ scale: 0.5, rotate: -20 }}
                            animate={{ scale: 1, rotate: 0 }}
                            className="text-3xl filter drop-shadow-glow"
                        >
                            {POWERUP_ICONS[stats.currentPowerUp]}
                        </motion.div>
                    ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center gap-1 opacity-20">
                            {[1,2,3].map(i => <div key={i} className="w-4 h-[2px] bg-white rounded-full" />)}
                        </div>
                    )}
                    {stats.currentPowerUp && (
                        <motion.div 
                            animate={{ opacity: [0.2, 0.5, 0.2] }}
                            transition={{ repeat: Infinity, duration: 1.5 }}
                            className="absolute inset-0 bg-gradient-to-tr from-arcade-amber/20 to-transparent"
                        />
                    )}
                </div>
            </motion.div>

            <div className={`flex flex-col gap-6 ${side === 'left' ? 'items-start' : 'items-end'}`}>
                {stats.activeEffect && (
                    <motion.div 
                        initial={{ x: side === 'left' ? -20 : 20, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        className="bg-arcade-amber text-slate-950 px-6 py-3 rounded-full font-black uppercase text-[11px] tracking-[0.2em] flex items-center gap-3 shadow-[0_0_30px_rgba(245,158,11,0.5)] border-2 border-white/20 italic"
                    >
                        <span className="text-2xl leading-none drop-shadow-sm">{POWERUP_ICONS[stats.activeEffect]}</span>
                        {stats.activeEffect.replace('_', ' ')}
                    </motion.div>
                )}

                {/* Turbo Bar */}
                {stats.isDrifting && (
                    <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex flex-col items-center gap-2 mb-4"
                    >
                        <div className="flex gap-1">
                            {[1, 2, 3].map(level => (
                                <div 
                                    key={level}
                                    className={`w-8 h-2 rounded-full transition-all duration-300 ${
                                        stats.turboStage >= level 
                                        ? (level === 3 ? 'bg-arcade-rose shadow-[0_0_10px_#f43f5e]' : 
                                           level === 2 ? 'bg-arcade-amber shadow-[0_0_8px_#f59e0b]' : 
                                           'bg-arcade-blue shadow-[0_0_6px_#3b82f6]')
                                        : 'bg-white/10'
                                    }`}
                                />
                            ))}
                        </div>
                        <div className={`text-[10px] font-black tracking-tighter uppercase italic px-3 py-1 rounded-md border border-white/10 ${
                            stats.turboStage === 3 ? 'text-arcade-rose' : 
                            stats.turboStage === 2 ? 'text-arcade-amber' : 
                            stats.turboStage === 1 ? 'text-arcade-blue' : 'text-slate-400'
                        }`}>
                            {stats.turboStage === 3 ? 'MAX TURBO!!' : 
                             stats.turboStage === 2 ? 'TURBO L2' : 
                             stats.turboStage === 1 ? 'TURBO L1' : 'DRIFTING...'}
                        </div>
                    </motion.div>
                )}

                {stats.boostTime > 0 && (
                    <motion.div 
                        initial={{ scale: 0.5, opacity: 0 }}
                        animate={{ scale: [1, 1.2, 1], opacity: 1 }}
                        transition={{ repeat: Infinity, duration: 0.3 }}
                        className={`mb-4 px-10 py-3 rounded-2xl font-black uppercase text-xl tracking-[0.2em] italic skew-x-[-12deg] border-4 shadow-2xl transition-colors ${
                            stats.turboStage >= 3 ? 'bg-arcade-rose border-white text-white shadow-arcade-rose/50' :
                            stats.turboStage >= 2 ? 'bg-arcade-amber border-white text-arcade-rose shadow-arcade-amber/50' :
                            'bg-arcade-blue border-white text-white shadow-arcade-blue/50'
                        }`}
                    >
                        {stats.turboStage >= 3 ? 'ULTRA BOOST!!!' : 'BOOST!'}
                    </motion.div>
                )}

                {/* Speedometer */}
                <motion.div 
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className={`w-40 h-40 rounded-full glass-dark flex flex-col items-center justify-center border-b-[12px] mb-6 shadow-2xl relative ${player === 1 ? 'border-arcade-rose' : 'border-arcade-blue'}`}
                >
                    <div className="absolute inset-0 rounded-full border-4 border-white/5" />
                    <div className={`text-5xl font-display font-black tracking-tighter italic leading-none ${color} text-glow-${player === 1 ? 'rose' : 'blue'}`}>{speedKmh}</div>
                    <div className="text-[10px] text-slate-500 uppercase font-black tracking-[0.3em] mt-2 italic translate-x-1">KM/H</div>
                    
                    <svg className="absolute inset-0 w-full h-full -rotate-90 pointer-events-none p-2">
                        <circle
                            cx="72"
                            cy="72"
                            r="64"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="6"
                            strokeDasharray="402"
                            strokeDashoffset={402 - (speedKmh / 200) * 402}
                            className={`${color} opacity-40`}
                            strokeLinecap="round"
                        />
                    </svg>
                    
                    {/* Tick marks */}
                    <div className="absolute inset-0 pointer-events-none">
                        {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map(deg => (
                            <div key={deg} className="absolute inset-1/2 w-4 h-[2px] bg-white/10 -translate-x-1/2 -translate-y-1/2" style={{ transform: `rotate(${deg}deg) translateX(68px)` }} />
                        ))}
                    </div>
                </motion.div>
            </div>
        </>
    )
}
