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
    };
    passResponse: string;
    failResponse: string;
  }
): Promise<ChatResponse> {
  try {
    // Create a thread with proper error handling
    let thread;
    try {
      thread = await openai.beta.threads.create();
    } catch (error) {
      console.error('Error creating thread:', error);
      throw new Error('Failed to create chat thread');
    }

    // Add messages to thread with proper formatting
    for (const msg of messages) {
      try {
        await openai.beta.threads.messages.create(thread.id, {
          role: msg.role,
          content: msg.content
        });
      } catch (error) {
        console.error('Error adding message to thread:', error);
        throw new Error('Failed to add message to thread');
      }
    }

    // Format the assistant prompt properly
    const assistantPrompt = `
Context: ${config.pageTitle}
System Instructions: ${config.openaiAgentConfig.systemPrompt}
Special Instructions: When you determine the conversation should end with a success, include #PASS# in your response.
If the conversation should end with a failure, include #FAIL# in your response.
Otherwise, continue the conversation normally.
`;

    // Run the assistant with the formatted prompt
    let run;
    try {
      const assistantId = config.openaiAgentConfig.assistantId;
      console.log('[OpenAI] Using assistant ID:', assistantId);
      run = await openai.beta.threads.runs.create(thread.id, {
        assistant_id: assistantId,
        instructions: assistantPrompt,
      });
    } catch (error) {
      console.error('Error starting assistant run:', error);
      throw new Error('Failed to start assistant');
    }

    // Wait for the run to complete with proper status checking
    let runStatus;
    while (true) {
      try {
        runStatus = await openai.beta.threads.runs.retrieve(thread.id, run.id);
        if (runStatus.status === "completed") break;
        if (runStatus.status === "failed" || runStatus.status === "cancelled") {
          throw new Error(`Assistant run ${runStatus.status}`);
        }
        if (!["queued", "in_progress"].includes(runStatus.status)) {
          throw new Error(`Unexpected status: ${runStatus.status}`);
        }
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        console.error('Error checking run status:', error);
        throw new Error('Failed to get assistant response');
      }
    }

    // Get the assistant's response with proper error handling
    let threadMessages;
    try {
      threadMessages = await openai.beta.threads.messages.list(thread.id);
    } catch (error) {
      console.error('Error retrieving messages:', error);
      throw new Error('Failed to get chat response');
    }

    const lastMessage = threadMessages.data[0].content[0];
    if (lastMessage.type !== 'text') throw new Error('Unexpected response type');

    const responseText = lastMessage.text.value;

    // Check for pass/fail status in the entire response
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