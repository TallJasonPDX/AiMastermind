import OpenAI from "openai";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI();

export interface ChatResponse {
  response: string;
  status: 'ongoing' | 'pass' | 'fail';
}

export async function processChat(
  messages: Array<{ role: 'user' | 'assistant'; content: string }>,
  config: {
    pageTitle: string;
    openaiAgentConfig: { 
      assistantId: string;
      systemPrompt: string;
    };
    passResponse: string;
    failResponse: string;
  }
): Promise<ChatResponse> {
  try {
    // Create a thread
    const thread = await openai.beta.threads.create();

    // Add all messages to the thread in order
    for (const msg of messages) {
      await openai.beta.threads.messages.create(thread.id, {
        role: msg.role === 'user' ? 'user' : 'assistant',
        content: msg.content,
      });
    }

    // Run the assistant
    const run = await openai.beta.threads.runs.create(thread.id, {
      assistant_id: config.openaiAgentConfig.assistantId,
      instructions: config.openaiAgentConfig.systemPrompt,
    });

    // Wait for the run to complete
    let runStatus = await openai.beta.threads.runs.retrieve(thread.id, run.id);
    while (runStatus.status === "queued" || runStatus.status === "in_progress") {
      await new Promise(resolve => setTimeout(resolve, 1000));
      runStatus = await openai.beta.threads.runs.retrieve(thread.id, run.id);
    }

    // Get the assistant's response
    const threadMessages = await openai.beta.threads.messages.list(thread.id);
    const lastMessage = threadMessages.data[0].content[0];
    if (lastMessage.type !== 'text') throw new Error('Unexpected response type');

    const responseText = lastMessage.text.value;

    // Check for pass/fail status
    if (responseText.includes('#PASS#')) {
      return {
        response: config.passResponse,
        status: 'pass',
      };
    } else if (responseText.includes('#FAIL#')) {
      return {
        response: config.failResponse,
        status: 'fail',
      };
    }

    return {
      response: responseText,
      status: 'ongoing',
    };
  } catch (error) {
    console.error('OpenAI chat error:', error);
    throw new Error('Failed to process chat message');
  }
}