import OpenAI from "openai";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export interface ChatResponse {
  response: string;
  status: 'ongoing' | 'pass' | 'fail';
}

export async function processChat(
  messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>,
  config: {
    pageTitle: string;
    openaiAgentConfig: { systemPrompt: string };
    passResponse: string;
    failResponse: string;
  }
): Promise<ChatResponse> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are an AI assistant for ${config.pageTitle}. ${config.openaiAgentConfig.systemPrompt}
          When you determine the conversation should end, include either #PASS# or #FAIL# at the start of your response.`,
        },
        ...messages,
      ],
      response_format: { type: "json_object" },
    });

    const content = response.choices[0].message.content || '';
    const result = JSON.parse(content);

    let status: 'ongoing' | 'pass' | 'fail' = 'ongoing';
    let responseText = result.response;

    if (responseText.startsWith('#PASS#')) {
      status = 'pass';
      responseText = config.passResponse;
    } else if (responseText.startsWith('#FAIL#')) {
      status = 'fail';
      responseText = config.failResponse;
    }

    return {
      response: responseText,
      status,
    };
  } catch (error) {
    console.error('OpenAI chat error:', error);
    throw new Error('Failed to process chat message');
  }
}