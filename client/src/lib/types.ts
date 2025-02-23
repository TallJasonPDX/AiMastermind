export interface Config {
  id: number;
  page_title: string;
  heygen_scene_id: string;
  openai_agent_config: {
    assistant_id: string;
  };
  pass_response: string;
  fail_response: string;
  voice_id: string;
  created_at: string;
  updated_at: string;
}

export interface ConversationFlow {
  id: number;
  config_id: number;
  order: number;
  video_filename: string;
  system_prompt: string;
  agent_question: string;
  pass_next: number | null;
  fail_next: number | null;
  video_only: boolean;
  show_form: boolean;
  form_name: string | null;
  input_delay: number;
  created_at: string;
  updated_at: string;
}
