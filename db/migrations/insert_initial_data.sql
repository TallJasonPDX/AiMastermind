-- Migration script to insert initial data into ai_mastermind database
-- Run this after creating the tables using create_database.sql

-- Insert configurations
INSERT INTO configurations (
    id, page_title, heygen_scene_id, voice_id,
    openai_agent_config, pass_response, fail_response,
    created_at, updated_at
) VALUES (
    1,
    'AI Conversation Demo',
    'demo-scene-123',
    '9d7ba6d68d2940579a07c4a0d934f914',
    '{"assistantId": "asst_demo123"}'::jsonb,
    'Great! Let''s continue our conversation.',
    'I apologize, I didn''t quite understand that. Could you please rephrase?',
    NOW(),
    NOW()
);

-- Insert conversation flows
INSERT INTO conversation_flows (
    id, config_id, order, video_filename,
    system_prompt, agent_question, pass_next, fail_next,
    video_only, show_form, form_name, input_delay,
    created_at, updated_at
) VALUES
    (1, 1, 1, 'intro.mp4',
     'You are a helpful assistant.',
     'How can I help you today?',
     2, 2, false, false, NULL, 0,
     NOW(), NOW()),

    (2, 1, 2, 'thinking.mp4',
     'Continue being helpful.',
     'What else would you like to know?',
     3, 3, false, false, NULL, 0,
     NOW(), NOW()),

    (3, 1, 3, 'goodbye.mp4',
     'Wrap up the conversation.',
     'Thank you for chatting! Goodbye!',
     NULL, NULL, true, false, NULL, 0,
     NOW(), NOW());

-- Insert conversations
INSERT INTO conversations (
    id, config_id, messages, status,
    created_at, updated_at
) VALUES (
    1,
    1,
    '[
        {"role": "assistant", "content": "Hello! How can I help you today?"},
        {"role": "user", "content": "Hi! I''d like to learn more about AI conversations."},
        {"role": "assistant", "content": "I''d be happy to explain how AI conversations work!"}
    ]'::jsonb,
    'completed',
    NOW(),
    NOW()
);

-- Reset sequences to start after our inserted data
SELECT setval('configurations_id_seq', (SELECT MAX(id) FROM configurations));
SELECT setval('conversation_flows_id_seq', (SELECT MAX(id) FROM conversation_flows));
SELECT setval('conversations_id_seq', (SELECT MAX(id) FROM conversations));