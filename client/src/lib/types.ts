export interface Config {
  id: number;
  pageTitle: string;
  heygenSceneId: string;
  openaiAgentConfig: {
    systemPrompt: string;
  };
  passResponse: string;
  failResponse: string;
  createdAt: string;
  updatedAt: string;
}
