-- Create form_submissions table if it doesn't exist
CREATE TABLE IF NOT EXISTS form_submissions (
    id SERIAL PRIMARY KEY,
    form_name VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(255),
    message TEXT,
    ip_address VARCHAR(255),
    additional_data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Add index on form_name for faster querying by form type
CREATE INDEX IF NOT EXISTS form_submissions_form_name_idx ON form_submissions(form_name);

-- Add index on created_at for chronological sorting
CREATE INDEX IF NOT EXISTS form_submissions_created_at_idx ON form_submissions(created_at);