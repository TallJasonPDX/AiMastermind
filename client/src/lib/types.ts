export interface Config {
  id: number;
  pageTitle: string;
  heygenSceneId: string;
  openaiAgentConfig: {
    assistantId: string;
  };
  passResponse: string;
  failResponse: string;
  voiceId: string;
  createdAt: string;
  updatedAt: string;
}

export interface ConversationFlow {
  id: number;
  configId: number;
  order: number;
  videoFilename: string;
  systemPrompt: string;
  agentQuestion: string;
  passNext: number | null;
  failNext: number | null;
  videoOnly: boolean;
  showForm: boolean;
  formName: string | null;
  inputDelay: number;
  createdAt: string;
  updatedAt: string;
}