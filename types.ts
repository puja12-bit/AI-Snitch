
export enum AnalysisType {
  TEXT = 'TEXT',
  IMAGE = 'IMAGE',
  VIDEO = 'VIDEO'
}

export interface AnalysisResult {
  isAI: boolean;
  confidence: number;
  explanation: string;
  artifacts: string[];
  sources?: Array<{
    title: string;
    uri: string;
  }>;
}

export interface Message {
  id: string;
  role: 'user' | 'model';
  content: string;
  timestamp: number;
  attachment?: string;
  result?: AnalysisResult;
}
