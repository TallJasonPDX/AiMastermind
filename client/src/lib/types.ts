export interface Config {
  id: number;
  pageTitle: string;
  heygenSceneId: string;
  openaiAgentConfig: {
    assistantId: string;
  };
  passResponse: string;
  failResponse: string;
  createdAt: string;
  updatedAt: string;
}
