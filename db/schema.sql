-- =====================================================================
-- AHNi Health Financing Situation Analysis  —  PostgreSQL schema
-- Stores submissions exported by the form (meta + answers) as JSONB,
-- with a few generated columns for easy filtering/reporting.
-- =====================================================================

CREATE TABLE IF NOT EXISTS hf_submission (
    id               BIGSERIAL PRIMARY KEY,
    form_id          TEXT        NOT NULL DEFAULT 'ahni_health_financing_situation_analysis',
    form_version     TEXT        NOT NULL DEFAULT '1.0',

    -- full payload exactly as the form exports it
    meta             JSONB       NOT NULL DEFAULT '{}'::jsonb,
    answers          JSONB       NOT NULL DEFAULT '{}'::jsonb,

    -- generated columns pulled out of meta for querying / indexing
    state            TEXT GENERATED ALWAYS AS (meta->>'state')    STORED,
    assessor         TEXT GENERATED ALWAYS AS (meta->>'assessor') STORED,
    reporting_period TEXT GENERATED ALWAYS AS (meta->>'period')   STORED,
    assessment_date  DATE GENERATED ALWAYS AS ((meta->>'date')::date) STORED,

    completion_pct   NUMERIC(5,2),
    submitted_by     TEXT,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS hf_submission_answers_gin ON hf_submission USING GIN (answers);
CREATE INDEX IF NOT EXISTS hf_submission_meta_gin    ON hf_submission USING GIN (meta);
CREATE INDEX IF NOT EXISTS hf_submission_state_idx   ON hf_submission (state);
CREATE INDEX IF NOT EXISTS hf_submission_date_idx    ON hf_submission (assessment_date);

-- Optional: keep updated_at fresh on edits
CREATE OR REPLACE FUNCTION hf_touch_updated_at() RETURNS trigger AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS hf_submission_touch ON hf_submission;
CREATE TRIGGER hf_submission_touch BEFORE UPDATE ON hf_submission
    FOR EACH ROW EXECUTE FUNCTION hf_touch_updated_at();

-- ---------------------------------------------------------------------
-- Insert a submission (the form's exported JSON goes in the two casts)
-- ---------------------------------------------------------------------
-- INSERT INTO hf_submission (meta, answers, completion_pct)
-- VALUES ($1::jsonb, $2::jsonb, $3);

-- ---------------------------------------------------------------------
-- Long / tidy view: one row per answered field (good for analytics & BI)
-- field_id matches the "field_id" in ahni-health-financing.form.json
-- ---------------------------------------------------------------------
CREATE OR REPLACE VIEW hf_answer_long AS
SELECT s.id           AS submission_id,
       s.state,
       s.assessment_date,
       kv.key         AS field_id,
       kv.value       AS value
FROM   hf_submission s,
       LATERAL jsonb_each_text(s.answers) AS kv(key, value)
WHERE  kv.value <> '';

-- Example query: HIV financing-adequacy ratings across states
--   SELECT submission_id, state, value
--   FROM   hf_answer_long
--   WHERE  field_id LIKE 'J-d0-%-st';
