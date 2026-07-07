-- =====================================================================
-- AHNi MEAL Rapid Assessment  —  PostgreSQL schema
-- One row per submitted instrument. meta holds the site header + the
-- instrument id; answers holds the instrument body (keyed by field_id).
-- =====================================================================

CREATE TABLE IF NOT EXISTS meal_submission (
    id            BIGSERIAL PRIMARY KEY,
    form_id       TEXT        NOT NULL DEFAULT 'ahni_meal_rapid_assessment',
    form_version  TEXT        NOT NULL DEFAULT '1.0',
    instrument    TEXT        NOT NULL,               -- '1'..'9' | 'annexC' | 'annexD'

    meta          JSONB       NOT NULL DEFAULT '{}'::jsonb,
    answers       JSONB       NOT NULL DEFAULT '{}'::jsonb,

    -- generated columns pulled from meta for filtering / reporting
    state              TEXT GENERATED ALWAYS AS (meta->>'state')    STORED,
    lga                TEXT GENERATED ALWAYS AS (meta->>'lga')      STORED,
    facility           TEXT GENERATED ALWAYS AS (meta->>'facility') STORED,
    tier               TEXT GENERATED ALWAYS AS (meta->>'tier')     STORED,
    assessor           TEXT GENERATED ALWAYS AS (meta->>'assessor') STORED,
    -- raw date string; parsed to a real DATE in the view (text->date is not IMMUTABLE)
    assessment_date_text TEXT GENERATED ALWAYS AS (meta->>'date')   STORED,

    completion_pct NUMERIC(5,2),
    submitted_by   TEXT,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS meal_submission_answers_gin ON meal_submission USING GIN (answers);
CREATE INDEX IF NOT EXISTS meal_submission_meta_gin    ON meal_submission USING GIN (meta);
CREATE INDEX IF NOT EXISTS meal_submission_instr_idx   ON meal_submission (instrument);
CREATE INDEX IF NOT EXISTS meal_submission_state_idx   ON meal_submission (state);
CREATE INDEX IF NOT EXISTS meal_submission_tier_idx    ON meal_submission (tier);

CREATE OR REPLACE FUNCTION meal_touch_updated_at() RETURNS trigger AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS meal_submission_touch ON meal_submission;
CREATE TRIGGER meal_submission_touch BEFORE UPDATE ON meal_submission
    FOR EACH ROW EXECUTE FUNCTION meal_touch_updated_at();

-- Long / tidy view: one row per answered field (analytics & BI).
CREATE OR REPLACE VIEW meal_answer_long AS
SELECT s.id           AS submission_id,
       s.instrument,
       s.state, s.lga, s.facility, s.tier,
       to_date(s.assessment_date_text, 'YYYY-MM-DD') AS assessment_date,
       kv.key         AS field_id,
       kv.value       AS value
FROM   meal_submission s,
       LATERAL jsonb_each_text(s.answers) AS kv(key, value)
WHERE  kv.value <> '';
