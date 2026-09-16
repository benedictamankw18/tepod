-- 0006_ago_sms_logs.sql
-- Capture the full AgoSMS delivery response for every send. Key fields are stored
-- as typed columns for easy querying, and the entire response is kept in raw_response
-- JSONB so no field is ever lost and future webhook/status updates can be stored too.

CREATE TABLE IF NOT EXISTS ago_sms_logs (
  id              TEXT PRIMARY KEY,
  notification_id TEXT REFERENCES notifications(id) ON DELETE CASCADE,
  request_id      TEXT,               -- meta.requestId
  message_id      TEXT,               -- data.messageId
  to_e164         TEXT,               -- normalized recipient
  segments        INTEGER,            -- data.segments
  cost            NUMERIC(12, 4),     -- data.cost
  balance         NUMERIC(14, 4),     -- data.balance
  status          TEXT,               -- data.status (e.g. SIMULATED)
  test_mode       BOOLEAN,            -- data.testMode
  success         BOOLEAN,            -- top-level success flag (false on failure)
  raw_response    JSONB,              -- full response payload
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ago_sms_logs_notification ON ago_sms_logs (notification_id);
