-- This migration first creates all necessary tables and then drops the unused 'configs' table.

-- Create configurations table
CREATE TABLE IF NOT EXISTS configurations (
    id SERIAL PRIMARY KEY,
    page_title TEXT NOT NULL,
    heygen_scene_id TEXT NOT NULL,
    voice_id TEXT NOT NULL DEFAULT '9d7ba6d68d2940579a07c4a0d934f914',
    openai_agent_config JSONB NOT NULL,
    pass_response TEXT NOT NULL,
    fail_response TEXT NOT NULL,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create conversation_flows table
CREATE TABLE IF NOT EXISTS conversation_flows (
    id SERIAL PRIMARY KEY,
    config_id INTEGER NOT NULL REFERENCES configurations(id),
    "order" INTEGER NOT NULL,
    video_filename TEXT NOT NULL,
    system_prompt TEXT NOT NULL,
    agent_question TEXT NOT NULL,
    pass_next INTEGER,
    fail_next INTEGER,
    video_only BOOLEAN NOT NULL DEFAULT FALSE,
    show_form BOOLEAN NOT NULL DEFAULT FALSE,
    form_name TEXT,
    input_delay INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create conversations table
CREATE TABLE IF NOT EXISTS conversations (
    id SERIAL PRIMARY KEY,
    config_id INTEGER NOT NULL REFERENCES configurations(id),
    messages JSONB NOT NULL,
    status TEXT NOT NULL DEFAULT 'ongoing',
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for foreign keys and commonly queried fields
CREATE INDEX IF NOT EXISTS idx_conversation_flows_config_id ON conversation_flows(config_id);
CREATE INDEX IF NOT EXISTS idx_conversation_flows_order ON conversation_flows("order");
CREATE INDEX IF NOT EXISTS idx_conversations_config_id ON conversations(config_id);
CREATE INDEX IF NOT EXISTS idx_conversations_status ON conversations(status);

-- Add trigger for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for each table
DO $$ BEGIN
 CREATE TRIGGER update_configurations_updated_at
     BEFORE UPDATE ON configurations
     FOR EACH ROW
     EXECUTE FUNCTION update_updated_at_column();
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 CREATE TRIGGER update_conversation_flows_updated_at
     BEFORE UPDATE ON conversation_flows
     FOR EACH ROW
     EXECUTE FUNCTION update_updated_at_column();
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 CREATE TRIGGER update_conversations_updated_at
     BEFORE UPDATE ON conversations
     FOR EACH ROW
     EXECUTE FUNCTION update_updated_at_column();
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Grant permissions (adjust as needed for your user)
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO current_user;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO current_user;

-- Drop the unused configs table (it's empty and not referenced by any foreign keys)
-- Run this after verifying the above tables are created successfully
DROP TABLE IF EXISTS configs;