
export enum AnalysisStep {
  PREPROCESSING = 'Preprocessing',
  FEATURE_EXTRACTION = 'Feature Extraction',
  VISUALIZATION = 'Visualization'
}

export enum ReferenceMethod {
  MONOPOLAR = 'Monopolar',
  BIPOLAR = 'Bipolar',
  LAPLACIAN = 'Laplacian (CAR)'
}

export interface ChannelData {
  id: string;
  label: string;
  data: number[]; // Time series voltage
  isBad: boolean;
}

export interface SignalConfig {
  sampleRate: number;
  notchFilter: 0 | 50 | 60; // 0 is disabled
  bandpass: [number, number];
  reference: ReferenceMethod;
}

export interface ChatMessage {
  role: 'user' | 'model';
  content: string;
  timestamp: Date;
}

export interface PSDPoint {
  frequency: number;
  power: number;
}
