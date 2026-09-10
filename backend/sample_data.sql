-- =============================================================================
-- sample_data.sql
-- Sample data for the Feature Management System
--
-- Execution order respects foreign key dependencies:
--   1. environments
--   2. feature_flags
--   3. environment_overrides  (depends on 1 + 2)
--   4. audit_logs
--
-- Safe to run multiple times — INSERT ... ON CONFLICT DO NOTHING prevents
-- duplicate rows on every unique/primary-key column.
-- =============================================================================


-- -----------------------------------------------------------------------------
-- 1. environments
-- Unique constraint: name
-- -----------------------------------------------------------------------------

INSERT INTO environments (name, description, created_at)
VALUES
    (
        'Development',
        'Used by developers for testing new features.',
        NOW() AT TIME ZONE 'UTC'
    ),
    (
        'UAT',
        'User Acceptance Testing environment.',
        NOW() AT TIME ZONE 'UTC'
    ),
    (
        'Production',
        'Live production environment.',
        NOW() AT TIME ZONE 'UTC'
    )
ON CONFLICT (name) DO NOTHING;


-- -----------------------------------------------------------------------------
-- 2. feature_flags
-- Unique constraint: key
-- -----------------------------------------------------------------------------

INSERT INTO feature_flags (key, description, type, default_value, enabled, owner_team, created_at)
VALUES
    (
        'dark_mode',
        'Enable Dark Mode UI',
        'boolean',
        'false',
        TRUE,
        'UI Team',
        NOW() AT TIME ZONE 'UTC'
    ),
    (
        'new_dashboard',
        'Enable redesigned dashboard',
        'boolean',
        'false',
        TRUE,
        'Frontend Team',
        NOW() AT TIME ZONE 'UTC'
    ),
    (
        'payment_v2',
        'Enable new payment system',
        'boolean',
        'false',
        TRUE,
        'Payments Team',
        NOW() AT TIME ZONE 'UTC'
    ),
    (
        'email_notifications',
        'Enable email notifications',
        'boolean',
        'true',
        TRUE,
        'Notification Team',
        NOW() AT TIME ZONE 'UTC'
    )
ON CONFLICT (key) DO NOTHING;


-- -----------------------------------------------------------------------------
-- 3. environment_overrides
-- Unique constraint: (flag_id, environment_id)
-- Resolved via subqueries — no hardcoded IDs, safe regardless of insert order.
-- -----------------------------------------------------------------------------

-- Development overrides
INSERT INTO environment_overrides (flag_id, environment_id, value)
VALUES
    (
        (SELECT id FROM feature_flags  WHERE key  = 'dark_mode'),
        (SELECT id FROM environments   WHERE name = 'Development'),
        TRUE
    ),
    (
        (SELECT id FROM feature_flags  WHERE key  = 'new_dashboard'),
        (SELECT id FROM environments   WHERE name = 'Development'),
        TRUE
    ),
    (
        (SELECT id FROM feature_flags  WHERE key  = 'payment_v2'),
        (SELECT id FROM environments   WHERE name = 'Development'),
        TRUE
    ),
    (
        (SELECT id FROM feature_flags  WHERE key  = 'email_notifications'),
        (SELECT id FROM environments   WHERE name = 'Development'),
        TRUE
    ),

-- UAT overrides
    (
        (SELECT id FROM feature_flags  WHERE key  = 'dark_mode'),
        (SELECT id FROM environments   WHERE name = 'UAT'),
        TRUE
    ),
    (
        (SELECT id FROM feature_flags  WHERE key  = 'new_dashboard'),
        (SELECT id FROM environments   WHERE name = 'UAT'),
        TRUE
    ),
    (
        (SELECT id FROM feature_flags  WHERE key  = 'payment_v2'),
        (SELECT id FROM environments   WHERE name = 'UAT'),
        FALSE
    ),
    (
        (SELECT id FROM feature_flags  WHERE key  = 'email_notifications'),
        (SELECT id FROM environments   WHERE name = 'UAT'),
        TRUE
    ),

-- Production overrides
    (
        (SELECT id FROM feature_flags  WHERE key  = 'dark_mode'),
        (SELECT id FROM environments   WHERE name = 'Production'),
        FALSE
    ),
    (
        (SELECT id FROM feature_flags  WHERE key  = 'new_dashboard'),
        (SELECT id FROM environments   WHERE name = 'Production'),
        FALSE
    ),
    (
        (SELECT id FROM feature_flags  WHERE key  = 'payment_v2'),
        (SELECT id FROM environments   WHERE name = 'Production'),
        FALSE
    ),
    (
        (SELECT id FROM feature_flags  WHERE key  = 'email_notifications'),
        (SELECT id FROM environments   WHERE name = 'Production'),
        TRUE
    )
ON CONFLICT ON CONSTRAINT uq_environment_overrides_flag_env DO NOTHING;


-- -----------------------------------------------------------------------------
-- 4. audit_logs
-- Records CREATE_FLAG events for all four feature flags.
-- old_value is NULL — no previous state exists for a creation event.
-- new_value captures the initial flag configuration as a JSON-like string.
-- Idempotency: skip if an identical (action, performed_by, new_value) row exists.
-- -----------------------------------------------------------------------------

INSERT INTO audit_logs (action, performed_by, old_value, new_value, timestamp)
VALUES
    (
        'CREATE_FLAG',
        'system',
        NULL,
        '{"key": "dark_mode", "type": "boolean", "default_value": "false", "enabled": true, "owner_team": "UI Team"}',
        NOW() AT TIME ZONE 'UTC'
    ),
    (
        'CREATE_FLAG',
        'system',
        NULL,
        '{"key": "new_dashboard", "type": "boolean", "default_value": "false", "enabled": true, "owner_team": "Frontend Team"}',
        NOW() AT TIME ZONE 'UTC'
    ),
    (
        'CREATE_FLAG',
        'system',
        NULL,
        '{"key": "payment_v2", "type": "boolean", "default_value": "false", "enabled": true, "owner_team": "Payments Team"}',
        NOW() AT TIME ZONE 'UTC'
    ),
    (
        'CREATE_FLAG',
        'system',
        NULL,
        '{"key": "email_notifications", "type": "boolean", "default_value": "true", "enabled": true, "owner_team": "Notification Team"}',
        NOW() AT TIME ZONE 'UTC'
    )
ON CONFLICT DO NOTHING;
