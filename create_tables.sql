-- Create campaigns table
CREATE TABLE IF NOT EXISTS campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR NOT NULL,
    subject VARCHAR NOT NULL,
    body TEXT NOT NULL,
    status VARCHAR DEFAULT 'draft' CHECK (status IN ('draft', 'queued', 'sending', 'completed', 'failed')),
    metadata JSONB,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create email_jobs table
CREATE TABLE IF NOT EXISTS email_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "campaignId" UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    "recipientEmail" VARCHAR NOT NULL,
    "recipientData" JSONB,
    status VARCHAR DEFAULT 'pending' CHECK (status IN ('pending', 'queued', 'sent', 'failed')),
    "retryCount" INTEGER DEFAULT 0,
    "sentAt" TIMESTAMP,
    error TEXT,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_campaigns_status ON campaigns(status);
CREATE INDEX IF NOT EXISTS idx_campaigns_created_at ON campaigns("createdAt" DESC);
CREATE INDEX IF NOT EXISTS idx_email_jobs_campaign_id ON email_jobs("campaignId");
CREATE INDEX IF NOT EXISTS idx_email_jobs_status ON email_jobs(status);
