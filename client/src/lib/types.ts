export interface Config {
  id: number;
  pageTitle: string;
  avatarId: string;
  openaiAgentConfig: {
    systemPrompt: string;
  };
  passResponse: string;
  failResponse: string;
  createdAt: string;
  updatedAt: string;
}
