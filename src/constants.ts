export interface GameConfig {
  lapsToWin: number;
  maxSpeed: number;
  acceleration: number;
  braking: number;
  steering: number;
  driftFactor: number;
  boostMultiplier: number;
}

export const GAME_CONFIG: GameConfig = {
  lapsToWin: 3,
  maxSpeed: 0.8,
  acceleration: 0.015,
  braking: 0.03,
  steering: 0.04,
  driftFactor: 0.95,
  boostMultiplier: 1.8,
};

export enum PowerUpType {
  SLOWDOWN = 'SLOWDOWN',
  REVERSE_ACCEL = 'REVERSE_ACCEL',
  INVERTED_STEERING = 'INVERTED_STEERING',
  NITRO = 'NITRO',
  AUTOPILOT = 'AUTOPILOT',
}

export enum GameMode {
  SINGLE_PLAYER = 'SINGLE_PLAYER',
  MULTIPLAYER = 'MULTIPLAYER',
}

export enum AIDifficulty {
  EASY = 'EASY',
  NORMAL = 'NORMAL',
  HARD = 'HARD',
}

export const POWERUP_ICONS: Record<PowerUpType, string> = {
  [PowerUpType.SLOWDOWN]: '🐌',
  [PowerUpType.REVERSE_ACCEL]: '◀️',
  [PowerUpType.INVERTED_STEERING]: '🔄',
  [PowerUpType.NITRO]: '🚀',
  [PowerUpType.AUTOPILOT]: '🤖',
};

export const LAP_OPTIONS = [3, 5, 7];

export interface PlayerStats {
  lap: number;
  checkpoints: number;
  currentPowerUp: PowerUpType | null;
  speed: number;
  isDrifting: boolean;
  driftTime: number;
  boostTime: number;
  turboStage: number; // 0, 1, 2, 3
  turboCharge: number; 
  effectTimer: number;
  activeEffect: PowerUpType | null;
  isWrongWay: boolean;
  wrongWayTimer: number;
  totalLaps: number;
  aiError: number;
}
