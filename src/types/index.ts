export interface ScriptItem {
  name: string;
  type: 'demo' | 'script' | 'zhennan';
  displayName?: string;
}

export interface LogEntry {
  id: string;
  timestamp: string;
  text: string;
  type: 'info' | 'success' | 'error' | 'output' | 'raw';
}

export interface IssuedToken {
  username: string;
  token: string;
  expiration: string;
  generationCount: number;
  createdAt: string;
}

export type UserRole = 'admin' | 'user' | null;

export type ActiveTab = 'console' | 'activities' | 'planner' | 'interaction' | 'manager';

export type TransportMode = 'serial' | 'bluetooth' | 'websocket';

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

export interface PlanSubStep {
  facial?: string;
  text?: string;
  image_filename?: string;
  image_path?: string;
  image_url?: string;
  movement?: string;
}

export interface PlanStep {
  title?: string;
  text?: string;
  question?: string;
  options?: string[];
  image_prompt?: string;
  image_filename?: string;
  image_path?: string;
  image_url?: string;
  sub_steps?: PlanSubStep[];
}

export interface ActivityPlan {
  activity_title: string;
  target_audience: string;
  approximate_duration: string;
  number_of_students: string;
  steps: PlanStep[];
}

export interface CustomInteraction {
  interaction_title: string;
  target_audience?: string;
  description?: string;
  scenes: any[];
}
