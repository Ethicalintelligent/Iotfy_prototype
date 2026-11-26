-- 011: three schemas only (IT-0042, admin, 26 Nov 2026). Schema telematics is removed.
--   core      = top-level tables: product tree, features, companies, users, assets, devices, models, networks,
--               data points, prices, sales.
--   gps       = detail and setup tables: asset details (vehicle, person, bin…), personal details, per-asset
--               details, alert setup, geofences, tickets.
--   telemetry = big tables only: positions, events, alerts, readings, live states, summaries, activity logs.
-- ALTER TABLE … SET SCHEMA keeps every row, key, link (foreign key), owned sequence and table privilege.
-- Safe to run again: a table already in its new schema is skipped.

CREATE SCHEMA IF NOT EXISTS core;
CREATE SCHEMA IF NOT EXISTS gps;
CREATE SCHEMA IF NOT EXISTS telemetry;

-- Every role that could use gps / telematics can use the three schemas.
DO $$
DECLARE r record;
BEGIN
    FOR r IN SELECT rolname FROM pg_roles
             WHERE rolname NOT LIKE 'pg\_%'
               AND (has_schema_privilege(rolname, 'gps', 'USAGE')
                    OR (EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = 'telematics')
                        AND has_schema_privilege(rolname, 'telematics', 'USAGE'))) LOOP
        EXECUTE format('GRANT USAGE ON SCHEMA core, gps, telemetry TO %I', r.rolname);
    END LOOP;
END $$;

DO $$
DECLARE
    m    text[];
    moves text[][] := ARRAY[
        -- gps -> core (top-level)
        ['gps', 'company', 'core'], ['gps', 'branch', 'core'], ['gps', 'app_user', 'core'],
        ['gps', 'tracked_asset', 'core'], ['gps', 'asset_group', 'core'], ['gps', 'device', 'core'],
        ['gps', 'sim_card', 'core'], ['gps', 'device_model', 'core'], ['gps', 'device_manufacturer', 'core'],
        ['gps', 'device_protocol', 'core'], ['gps', 'solution', 'core'],
        -- telematics -> core (network and data points)
        ['telematics', 'networks', 'core'], ['telematics', 'data_points', 'core'],
        ['telematics', 'device_data_points', 'core'], ['telematics', 'sensor_data_points', 'core'],
        -- core -> gps (asset details, personal details, per-asset details)
        ['core', 'vehicle_details', 'gps'], ['core', 'person_details', 'gps'], ['core', 'atm_details', 'gps'],
        ['core', 'tank_details', 'gps'], ['core', 'movable_asset_details', 'gps'],
        ['core', 'camera_view_details', 'gps'], ['core', 'user_profiles', 'gps'], ['core', 'vehicle_io', 'gps'],
        ['core', 'asset_identifiers', 'gps'],
        -- core -> gps (alert setup, geofences, tickets)
        ['core', 'alert_rules', 'gps'], ['core', 'alert_rule_templates', 'gps'], ['core', 'alert_configs', 'gps'],
        ['core', 'alert_recipients', 'gps'], ['core', 'alert_tickets', 'gps'],
        ['core', 'notification_recipients', 'gps'], ['core', 'rule_settings', 'gps'],
        ['core', 'geofences', 'gps'], ['core', 'geofence_assignments', 'gps'], ['core', 'vehicle_geofences', 'gps'],
        ['core', 'tickets', 'gps'], ['core', 'ticket_events', 'gps'], ['core', 'ticket_attachments', 'gps'],
        ['core', 'ticket_settings', 'gps'], ['core', 'ticket_notification_reads', 'gps'],
        -- telematics -> gps (asset details, certificates)
        ['telematics', 'bin_details', 'gps'], ['telematics', 'generator_details', 'gps'],
        ['telematics', 'room_details', 'gps'], ['telematics', 'dispenser_details', 'gps'],
        ['telematics', 'inventory_item_details', 'gps'], ['telematics', 'telecom_site_details', 'gps'],
        ['telematics', 'certificates', 'gps'],
        -- -> telemetry (big tables)
        ['gps', 'vehicle_position', 'telemetry'],
        ['telematics', 'iot_live_states', 'telemetry'], ['telematics', 'reading_hourly_summaries', 'telemetry'],
        ['telematics', 'rfid_reads', 'telemetry'],
        ['core', 'alerts', 'telemetry'], ['core', 'alert_notifications', 'telemetry'],
        ['core', 'attendance_punches', 'telemetry'], ['core', 'dashcam_media', 'telemetry'],
        ['core', 'dispense_transactions', 'telemetry'], ['core', 'student_boardings', 'telemetry']
    ];
BEGIN
    FOREACH m SLICE 1 IN ARRAY moves LOOP
        IF to_regclass(format('%I.%I', m[1], m[2])) IS NOT NULL
           AND to_regclass(format('%I.%I', m[3], m[2])) IS NULL THEN
            EXECUTE format('ALTER TABLE %I.%I SET SCHEMA %I', m[1], m[2], m[3]);
        END IF;
    END LOOP;
END $$;

-- telematics is gone once it is empty (RESTRICT: never drops a table that was not moved).
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = 'telematics')
       AND NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
                       WHERE n.nspname = 'telematics') THEN
        DROP SCHEMA telematics RESTRICT;
    END IF;
END $$;
