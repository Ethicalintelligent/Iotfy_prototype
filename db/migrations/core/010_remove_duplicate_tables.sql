-- 010: remove the duplicate tables (IT-0040, admin, 25 Nov 2026).
-- After 008 (schema gps) and 009 (the Dealer Flow DDL, schema telematics), 25 old prototype tables held the same
-- things as a new gps / telematics table. This file copies every old row into its new table, moves every link
-- (foreign key) from the old table to the new one, and drops the old tables, so each table exists once.
--
--   old (text ids)                                   new
--   core.companies                                -> gps.company          (bigint id, old id in legacy_id)
--   core.users                                    -> gps.app_user
--   core.assets                                   -> gps.tracked_asset
--   core.device_units + core.device_details       -> gps.device
--   core.device_models                            -> gps.device_model     (+ gps.device_manufacturer, protocol GENERIC)
--   core.connectivity + core.sim_details          -> gps.sim_card
--   core.asset_groups                             -> gps.asset_group
--   core.sites                                    -> gps.branch
--   telemetry.vehicle_positions (empty)           -> gps.vehicle_position
--   core.networks, data_points, device_data_points, sensor_data_points, certificates,
--   generator / telecom_site / room / dispenser / inventory_item / bin _details     -> telematics.* (same text ids)
--   telemetry.rfid_reads, iot_live_states, reading_hourly_summaries (empty)          -> telematics.*
--
-- Additions to the QA (gps) tables, agreed with the admin so no prototype data is lost:
--   * legacy_id (old text id) on every gps table that received rows; legacy jsonb on company and app_user.
--   * app_user: user type DEALER + dealer_id (dealer users have no company), role_id, asset_group.
--     Users without an email get the demo email the apps showed (name.slug@iotify.demo); users
--     without a password get the demo password demo1234.
--   * device and sim_card: company_id may be empty when owner_dealer_id is set (stock held by a dealer).
--   * device_model: the 14 prototype device kinds kept as written, e.g. "RFID reader" (device_type check removed), network, certifications, placement, ...
--   * sim_card: status IN_STOCK, network, identifier type, billing, reminders.
--   * core.sensor_models.sensor_type_id (bigint), the number telematics.sensor_data_points and hardware_prices use.
-- Every link column that pointed to a moved table becomes bigint (or stays text for telematics) and points to the
-- new table. subscriptions.buyer_id / seller_id and support_sessions.target_account_id get the new company numbers.
--
-- Safe to run twice: it does nothing once core.companies is gone. Run as the owner, in one transaction.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE OR REPLACE FUNCTION pg_temp.it0040_map(old_table text, old_id text) RETURNS bigint
LANGUAGE plpgsql STABLE AS $$
DECLARE
    n bigint;
BEGIN
    IF old_id IS NULL OR old_id = '' THEN
        RETURN NULL;
    END IF;
    SELECT new_id INTO n FROM it0040_id_map m WHERE m.old_table = $1 AND m.old_id = $2;
    IF n IS NULL THEN
        RAISE EXCEPTION 'IT-0040: % row % has no new row (link would be lost)', $1, $2;
    END IF;
    RETURN n;
END $$;

CREATE OR REPLACE FUNCTION pg_temp.it0040_sensor_no(old_id text) RETURNS bigint
LANGUAGE plpgsql STABLE AS $$ BEGIN RETURN (SELECT sensor_type_id FROM core.sensor_models WHERE id = old_id); END $$;

CREATE OR REPLACE FUNCTION pg_temp.it0040_merge() RETURNS void
LANGUAGE plpgsql AS $fn$
DECLARE
    r        record;
    moved    text[] := ARRAY['core.companies', 'core.users', 'core.assets', 'core.device_units', 'core.device_models',
                             'core.connectivity', 'core.asset_groups', 'core.sites', 'core.networks', 'core.data_points'];
    targets  text[] := ARRAY['gps.company', 'gps.app_user', 'gps.tracked_asset', 'gps.device', 'gps.device_model',
                             'gps.sim_card', 'gps.asset_group', 'gps.branch', 'telematics.networks',
                             'telematics.data_points'];
    dropped  text[] := ARRAY['core.companies', 'core.users', 'core.assets', 'core.device_units', 'core.device_details',
                             'core.device_models', 'core.connectivity', 'core.sim_details', 'core.asset_groups',
                             'core.sites', 'core.networks', 'core.data_points', 'core.device_data_points',
                             'core.sensor_data_points', 'core.certificates', 'core.generator_details',
                             'core.telecom_site_details', 'core.room_details', 'core.dispenser_details',
                             'core.inventory_item_details', 'core.bin_details', 'telemetry.vehicle_positions',
                             'telemetry.rfid_reads', 'telemetry.iot_live_states',
                             'telemetry.reading_hourly_summaries'];
    new_t    text;
    n_old    bigint;
    n_new    bigint;
BEGIN
    -- Check links row by row (the gps / telematics links are deferred), so tables can be altered after inserts.
    SET CONSTRAINTS ALL IMMEDIATE;

    CREATE TEMP TABLE it0040_id_map (
        old_table text,
        old_id    text,
        new_id    bigint NOT NULL,
        PRIMARY KEY (old_table, old_id)
    ) ON COMMIT DROP;

    -- Empty tables only: nothing to copy, but refuse if a branch has rows there.
    FOREACH new_t IN ARRAY ARRAY['telemetry.vehicle_positions', 'telemetry.rfid_reads', 'telemetry.iot_live_states',
                                 'telemetry.reading_hourly_summaries'] LOOP
        EXECUTE format('SELECT count(*) FROM %s', new_t) INTO n_old;
        IF n_old > 0 THEN
            RAISE EXCEPTION 'IT-0040: % has % rows; copy them before dropping it', new_t, n_old;
        END IF;
    END LOOP;

    -- ------------------------------------------------------------------ 1. extend the gps tables
    ALTER TABLE gps.company
        ADD COLUMN IF NOT EXISTS contact text,
        ADD COLUMN IF NOT EXISTS legacy  jsonb NOT NULL DEFAULT '{}';

    ALTER TABLE gps.app_user
        DROP CONSTRAINT IF EXISTS app_user_user_type_check,
        DROP CONSTRAINT IF EXISTS app_user_check,
        ADD COLUMN IF NOT EXISTS dealer_id   text REFERENCES core.dealers (id) DEFERRABLE INITIALLY DEFERRED,
        ADD COLUMN IF NOT EXISTS role_id     text REFERENCES core.roles (id) DEFERRABLE INITIALLY DEFERRED,
        ADD COLUMN IF NOT EXISTS asset_group text,
        ADD COLUMN IF NOT EXISTS updated_at  timestamptz NOT NULL DEFAULT now(),
        ADD COLUMN IF NOT EXISTS legacy      jsonb NOT NULL DEFAULT '{}';
    ALTER TABLE gps.app_user
        ADD CONSTRAINT app_user_user_type_check
            CHECK (user_type IN ('SUPER_ADMIN', 'DEALER', 'COMPANY_ADMIN', 'USER')),
        ADD CONSTRAINT app_user_account_check
            CHECK (CASE user_type
                       WHEN 'SUPER_ADMIN' THEN company_id IS NULL AND dealer_id IS NULL
                       WHEN 'DEALER'      THEN company_id IS NULL AND dealer_id IS NOT NULL
                       ELSE company_id IS NOT NULL
                   END);

    ALTER TABLE gps.branch
        ADD COLUMN IF NOT EXISTS status     text,
        ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now(),
        ADD COLUMN IF NOT EXISTS legacy_id  varchar(50);

    ALTER TABLE gps.asset_group
        ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now(),
        ADD COLUMN IF NOT EXISTS legacy_id  varchar(50);

    ALTER TABLE gps.device_model
        DROP CONSTRAINT IF EXISTS device_model_device_type_check,
        ADD COLUMN IF NOT EXISTS network           text,
        ADD COLUMN IF NOT EXISTS own_hardware      boolean,
        ADD COLUMN IF NOT EXISTS status            text,
        ADD COLUMN IF NOT EXISTS certifications    text,
        ADD COLUMN IF NOT EXISTS placement         text,
        ADD COLUMN IF NOT EXISTS server_configured boolean,
        ADD COLUMN IF NOT EXISTS created_at        timestamptz NOT NULL DEFAULT now(),
        ADD COLUMN IF NOT EXISTS updated_at        timestamptz NOT NULL DEFAULT now(),
        ADD COLUMN IF NOT EXISTS legacy_id         varchar(50);

    ALTER TABLE gps.tracked_asset
        DROP CONSTRAINT IF EXISTS tracked_asset_status_check,
        ADD COLUMN IF NOT EXISTS asset_type_id text REFERENCES core.asset_types (id) DEFERRABLE INITIALLY DEFERRED,
        ADD COLUMN IF NOT EXISTS site_id       bigint REFERENCES gps.branch (id) DEFERRABLE INITIALLY DEFERRED,
        ADD COLUMN IF NOT EXISTS carried_by    bigint REFERENCES gps.tracked_asset (id) DEFERRABLE INITIALLY DEFERRED,
        ADD COLUMN IF NOT EXISTS legacy_id     varchar(50);
    -- Vehicles can be in maintenance (Manage > Vehicle, asset status).
    ALTER TABLE gps.tracked_asset
        ADD CONSTRAINT tracked_asset_status_check CHECK (status IN ('ACTIVE', 'INACTIVE', 'MAINTENANCE'));

    ALTER TABLE gps.sim_card
        ALTER COLUMN company_id DROP NOT NULL,
        DROP CONSTRAINT IF EXISTS sim_card_status_check,
        ADD COLUMN IF NOT EXISTS network_id        text,
        ADD COLUMN IF NOT EXISTS identifier_type   text,
        ADD COLUMN IF NOT EXISTS billing           text,
        ADD COLUMN IF NOT EXISTS reminders         text[] NOT NULL DEFAULT '{}',
        ADD COLUMN IF NOT EXISTS subscription_date date,
        ADD COLUMN IF NOT EXISTS expiry_reminder   text,
        ADD COLUMN IF NOT EXISTS active            boolean NOT NULL DEFAULT true,
        ADD COLUMN IF NOT EXISTS legacy_id         varchar(50);
    ALTER TABLE gps.sim_card
        ADD CONSTRAINT sim_card_status_check CHECK (status IN ('ACTIVE', 'INACTIVE', 'SUSPENDED', 'IN_STOCK')),
        ADD CONSTRAINT sim_card_owner_check CHECK (company_id IS NOT NULL OR owner_dealer_id IS NOT NULL);

    ALTER TABLE gps.device
        ALTER COLUMN company_id DROP NOT NULL,
        ADD COLUMN IF NOT EXISTS asset_id        bigint REFERENCES gps.tracked_asset (id) DEFERRABLE INITIALLY DEFERRED,
        ADD COLUMN IF NOT EXISTS zone_id         text REFERENCES core.zones (id) DEFERRABLE INITIALLY DEFERRED,
        ADD COLUMN IF NOT EXISTS device_type     text,
        ADD COLUMN IF NOT EXISTS primary_unit_id bigint REFERENCES gps.device (id) DEFERRABLE INITIALLY DEFERRED,
        ADD COLUMN IF NOT EXISTS device_name     text,
        ADD COLUMN IF NOT EXISTS expiry_reminder text,
        ADD COLUMN IF NOT EXISTS active          boolean NOT NULL DEFAULT true,
        ADD COLUMN IF NOT EXISTS legacy_id       varchar(50);
    ALTER TABLE gps.device
        ADD CONSTRAINT device_owner_check CHECK (company_id IS NOT NULL OR owner_dealer_id IS NOT NULL);

    ALTER TABLE core.sensor_models ADD COLUMN IF NOT EXISTS sensor_type_id bigint GENERATED BY DEFAULT AS IDENTITY;
    ALTER TABLE core.sensor_models ADD CONSTRAINT sensor_models_sensor_type_id_key UNIQUE (sensor_type_id);

    -- ------------------------------------------------------------------ 2. copy the rows
    -- Companies
    INSERT INTO gps.company (public_id, created_at, updated_at, name, status, country_code, legacy_id, dealer_id,
                             support_access_until, contact, legacy)
    SELECT gen_random_uuid(), c.created_at, c.updated_at, coalesce(c.name, c.id),
           CASE WHEN c.status = 'Suspended' THEN 'SUSPENDED' ELSE 'ACTIVE' END,
           CASE c.country WHEN 'India' THEN 'IN' WHEN 'Saudi Arabia' THEN 'SA' WHEN 'United Arab Emirates' THEN 'AE'
                          WHEN 'Oman' THEN 'OM' WHEN 'Qatar' THEN 'QA' WHEN 'Kuwait' THEN 'KW'
                          WHEN 'Bahrain' THEN 'BH' END,
           c.id, c.dealer_id, c.support_access_until, c.contact,
           jsonb_strip_nulls(jsonb_build_object('country', c.country, 'status', c.status))
    FROM core.companies c
    ORDER BY c.created_at, length(c.id), c.id;
    INSERT INTO it0040_id_map SELECT 'core.companies', legacy_id, id FROM gps.company WHERE legacy_id IS NOT NULL;

    -- Sites -> branches
    INSERT INTO gps.branch (company_id, name, location, status, created_at, updated_at, legacy_id)
    SELECT pg_temp.it0040_map('core.companies', s.company_id), coalesce(s.name, s.id), s.address, s.status,
           s.created_at, s.updated_at, s.id
    FROM core.sites s
    ORDER BY s.created_at, s.id;
    INSERT INTO it0040_id_map SELECT 'core.sites', legacy_id, id FROM gps.branch WHERE legacy_id IS NOT NULL;

    -- Asset groups
    INSERT INTO gps.asset_group (public_id, created_at, updated_at, company_id, name, legacy_id)
    SELECT gen_random_uuid(), g.created_at, g.updated_at, pg_temp.it0040_map('core.companies', g.company_id), g.name,
           g.id
    FROM core.asset_groups g
    ORDER BY g.created_at, g.id;
    INSERT INTO it0040_id_map SELECT 'core.asset_groups', legacy_id, id FROM gps.asset_group WHERE legacy_id IS NOT NULL;
    UPDATE gps.asset_group n SET parent_id = pg_temp.it0040_map('core.asset_groups', o.parent_id)
    FROM core.asset_groups o WHERE o.id = n.legacy_id AND o.parent_id IS NOT NULL;

    -- Users
    INSERT INTO gps.app_user (public_id, created_at, updated_at, company_id, dealer_id, user_type, email, name,
                              password_hash, role_id, asset_group, legacy_id, legacy)
    SELECT gen_random_uuid(), u.created_at, u.updated_at,
           CASE WHEN u.level = 'Company' THEN pg_temp.it0040_map('core.companies', u.account_id) END,
           CASE WHEN u.level = 'Dealer' THEN u.account_id END,
           CASE u.level WHEN 'Platform' THEN 'SUPER_ADMIN'
                        WHEN 'Dealer'   THEN 'DEALER'
                        ELSE CASE WHEN rl.name ILIKE '%admin%' THEN 'COMPANY_ADMIN' ELSE 'USER' END END,
           coalesce(u.email, trim(BOTH '.' FROM regexp_replace(lower(coalesce(u.name, u.id)), '[^a-z0-9]+', '.', 'g'))
                             || '@iotify.demo'),
           coalesce(u.name, u.id),
           coalesce(u.password_hash, crypt('demo1234', gen_salt('bf', 10))),
           u.role_id, u.asset_group, u.id,
           jsonb_strip_nulls(jsonb_build_object('level', u.level, 'account_id', u.account_id, 'email', u.email))
    FROM core.users u
    LEFT JOIN core.roles rl ON rl.id = u.role_id
    ORDER BY u.created_at, length(u.id), u.id;
    INSERT INTO it0040_id_map SELECT 'core.users', legacy_id, id FROM gps.app_user WHERE legacy_id IS NOT NULL;

    -- Networks and data points: same text ids
    INSERT INTO telematics.networks (id, name, category, needs, downlink, real_time, typical_interval_seconds, markets,
                                     connectivity_fee, identifier_type, notes, status, created_at, updated_at)
    SELECT id, name, category, needs, downlink, real_time, typical_interval_seconds, markets, connectivity_fee,
           identifier_type, notes, status, created_at, updated_at
    FROM core.networks
    ON CONFLICT (id) DO NOTHING;
    INSERT INTO telematics.data_points (id, name, unit, direction, created_at, updated_at)
    SELECT id, name, unit, direction, created_at, updated_at FROM core.data_points
    ON CONFLICT (id) DO NOTHING;

    -- Device models (maker -> device_manufacturer, protocol GENERIC until a real protocol is set)
    INSERT INTO gps.device_protocol (code) VALUES ('GENERIC') ON CONFLICT (code) DO NOTHING;
    INSERT INTO gps.device_manufacturer (name)
    SELECT DISTINCT coalesce(maker, 'Unknown') FROM core.device_models
    ON CONFLICT (name) DO NOTHING;
    INSERT INTO gps.device_model (manufacturer_id, name, protocol_code, device_type, network, own_hardware, status,
                                  certifications, placement, server_configured, created_at, updated_at, legacy_id)
    SELECT m.id, coalesce(d.model, d.id), 'GENERIC',
           coalesce(d.type, 'Other'),
           d.network, d.own_hardware, d.status, d.certifications, d.placement, d.server_configured,
           d.created_at, d.updated_at, d.id
    FROM core.device_models d
    JOIN gps.device_manufacturer m ON m.name = coalesce(d.maker, 'Unknown')
    ORDER BY d.created_at, length(d.id), d.id;
    INSERT INTO it0040_id_map SELECT 'core.device_models', legacy_id, id FROM gps.device_model WHERE legacy_id IS NOT NULL;
    ALTER TABLE gps.device_model
        ADD CONSTRAINT device_model_network_fkey FOREIGN KEY (network) REFERENCES telematics.networks (id)
            DEFERRABLE INITIALLY DEFERRED;

    -- Assets
    INSERT INTO gps.tracked_asset (public_id, created_at, updated_at, company_id, asset_type, asset_type_id, code, name,
                                   group_id, site_id, asset_info, status, legacy_id)
    SELECT gen_random_uuid(), a.created_at, a.updated_at, pg_temp.it0040_map('core.companies', a.company_id),
           coalesce(upper(trim(BOTH '_' FROM regexp_replace(t.name, '[^A-Za-z0-9]+', '_', 'g'))), 'OTHER'),
           a.asset_type_id, a.plate_serial, coalesce(a.name, a.plate_serial, a.id), g.id,
           pg_temp.it0040_map('core.sites', a.site_id), a.attributes,
           CASE WHEN a.status IN ('Inactive', 'Retired', 'Deleted') THEN 'INACTIVE'
                WHEN a.status = 'Maintenance' THEN 'MAINTENANCE' ELSE 'ACTIVE' END, a.id
    FROM core.assets a
    LEFT JOIN core.asset_types t ON t.id = a.asset_type_id
    LEFT JOIN gps.asset_group g ON g.company_id = pg_temp.it0040_map('core.companies', a.company_id)
                               AND g.name = a.asset_group
    ORDER BY a.created_at, length(a.id), a.id;
    INSERT INTO it0040_id_map SELECT 'core.assets', legacy_id, id FROM gps.tracked_asset WHERE legacy_id IS NOT NULL;
    UPDATE gps.tracked_asset n SET carried_by = pg_temp.it0040_map('core.assets', o.carried_by)
    FROM core.assets o WHERE o.id = n.legacy_id AND o.carried_by IS NOT NULL;

    -- SIM cards (connectivity + sim_details)
    INSERT INTO gps.sim_card (public_id, created_at, updated_at, company_id, owner_dealer_id, iccid, msisdn, provider,
                              plan, pin_code, puk_code, support_no, purchase_date, subscription_date, expiry_reminder,
                              active, status, network_id, identifier_type, billing, reminders, legacy_id)
    SELECT gen_random_uuid(), c.created_at, c.updated_at, pg_temp.it0040_map('core.companies', du.company_id),
           c.owner_dealer_id, coalesce(c.identifier, c.id), c.number, c.provider, s.plan, s.pin_code, s.puk_code,
           s.support_number, s.purchase_date, s.subscription_date, s.expiry_reminder, coalesce(s.active, true),
           CASE c.status WHEN 'In stock' THEN 'IN_STOCK' WHEN 'Suspended' THEN 'SUSPENDED'
                         WHEN 'Inactive' THEN 'INACTIVE' ELSE 'ACTIVE' END,
           c.network_id, c.identifier_type, c.billing, c.reminders, c.id
    FROM core.connectivity c
    LEFT JOIN core.sim_details s ON s.connectivity_id = c.id
    LEFT JOIN core.device_units du ON du.id = c.device_unit_id
    ORDER BY c.created_at, length(c.id), c.id;
    INSERT INTO it0040_id_map SELECT 'core.connectivity', legacy_id, id FROM gps.sim_card WHERE legacy_id IS NOT NULL;
    ALTER TABLE gps.sim_card
        ADD CONSTRAINT sim_card_network_id_fkey FOREIGN KEY (network_id) REFERENCES telematics.networks (id)
            DEFERRABLE INITIALLY DEFERRED;

    -- Devices (device_units + device_details)
    INSERT INTO gps.device (public_id, created_at, updated_at, company_id, owner_dealer_id, imei, protocol, model,
                            model_id, asset_id, zone_id, status, serial_no, purchase_date, warranty_expiry,
                            additional_warranty, device_type, device_name, expiry_reminder, active, legacy_id)
    SELECT gen_random_uuid(), u.created_at, u.updated_at, pg_temp.it0040_map('core.companies', u.company_id),
           u.owner_dealer_id, coalesce(u.imei, u.id), 'GENERIC', m.model,
           pg_temp.it0040_map('core.device_models', u.device_model_id), pg_temp.it0040_map('core.assets', u.asset_id),
           u.zone_id,
           CASE u.status WHEN 'In stock' THEN 'IN_STOCK' WHEN 'Faulty' THEN 'FAULTY'
                         WHEN 'Inactive' THEN 'INACTIVE' ELSE 'ACTIVE' END,
           d.serial_number, d.purchase_date, d.warranty_expiry, d.extended_warranty, d.device_type, d.device_name,
           d.expiry_reminder, coalesce(d.active, true), u.id
    FROM core.device_units u
    LEFT JOIN core.device_models m ON m.id = u.device_model_id
    LEFT JOIN core.device_details d ON d.device_unit_id = u.id
    ORDER BY u.created_at, length(u.id), u.id;
    INSERT INTO it0040_id_map SELECT 'core.device_units', legacy_id, id FROM gps.device WHERE legacy_id IS NOT NULL;
    UPDATE gps.device n SET primary_unit_id = pg_temp.it0040_map('core.device_units', d.primary_unit_id)
    FROM core.device_details d WHERE d.device_unit_id = n.legacy_id AND d.primary_unit_id IS NOT NULL;
    UPDATE gps.device n SET sim_card_id = s.id
    FROM gps.sim_card s JOIN core.connectivity c ON c.id = s.legacy_id
    WHERE n.legacy_id = c.device_unit_id;

    -- Catalogue links and certificates (same text ids)
    INSERT INTO telematics.device_data_points (id, device_model_id, data_point_id, created_at, updated_at)
    SELECT id, pg_temp.it0040_map('core.device_models', device_model_id), data_point_id, created_at, updated_at
    FROM core.device_data_points
    ON CONFLICT (id) DO NOTHING;
    INSERT INTO telematics.sensor_data_points (id, sensor_model_id, data_point_id, created_at, updated_at)
    SELECT id, pg_temp.it0040_sensor_no(sensor_model_id), data_point_id, created_at, updated_at
    FROM core.sensor_data_points
    ON CONFLICT (id) DO NOTHING;
    ALTER TABLE telematics.sensor_data_points
        ADD CONSTRAINT sensor_data_points_sensor_model_id_fkey FOREIGN KEY (sensor_model_id)
            REFERENCES core.sensor_models (sensor_type_id) DEFERRABLE INITIALLY DEFERRED;
    INSERT INTO telematics.certificates (id, asset_id, device_unit_id, certification, certificate_no, issued_by,
                                         issued_on, valid_until, status, created_at, updated_at)
    SELECT id, pg_temp.it0040_map('core.assets', asset_id), pg_temp.it0040_map('core.device_units', device_unit_id),
           certification, certificate_no, issued_by, issued_on, valid_until, status, created_at, updated_at
    FROM core.certificates
    ON CONFLICT (id) DO NOTHING;

    -- Detail tables (empty on main; copied for branches that have rows). zone_id: zones keep text ids, so it is
    -- left empty here (no zone link in the telematics tables yet).
    INSERT INTO telematics.generator_details (asset_id, make, model, rating_kva, phase, fuel_tank_l, engine_serial,
        alternator_serial, install_date, run_hours_at_install, service_interval_h, last_service_date, created_at,
        updated_at)
    SELECT pg_temp.it0040_map('core.assets', asset_id), make, model, rating_kva, phase, fuel_tank_l, engine_serial,
           alternator_serial, install_date, run_hours_at_install, service_interval_h, last_service_date, created_at,
           updated_at
    FROM core.generator_details;
    INSERT INTO telematics.telecom_site_details (asset_id, site_code, tower_type, operator_name, tenant_count,
        grid_connected, has_generator, battery_bank_ah, rectifier_model, lat, lng, created_at, updated_at)
    SELECT pg_temp.it0040_map('core.assets', asset_id), site_code, tower_type, operator_name, tenant_count,
           grid_connected, has_generator, battery_bank_ah, rectifier_model, lat, lng, created_at, updated_at
    FROM core.telecom_site_details;
    INSERT INTO telematics.room_details (asset_id, room_type, area_m2, rack_count, temp_min_c, temp_max_c,
        humidity_min_pct, humidity_max_pct, created_at, updated_at)
    SELECT pg_temp.it0040_map('core.assets', asset_id), room_type, area_m2, rack_count, temp_min_c, temp_max_c,
           humidity_min_pct, humidity_max_pct, created_at, updated_at
    FROM core.room_details;
    INSERT INTO telematics.dispenser_details (asset_id, make, model, nozzle_count, product, tank_asset_id,
        totaliser_start_l, unit_price, created_at, updated_at)
    SELECT pg_temp.it0040_map('core.assets', asset_id), make, model, nozzle_count, product,
           pg_temp.it0040_map('core.assets', tank_asset_id), totaliser_start_l, unit_price, created_at, updated_at
    FROM core.dispenser_details;
    INSERT INTO telematics.inventory_item_details (asset_id, sku, epc, batch_no, quantity, unit, expiry_date,
        created_at, updated_at)
    SELECT pg_temp.it0040_map('core.assets', asset_id), sku, epc, batch_no, quantity, unit, expiry_date, created_at,
           updated_at
    FROM core.inventory_item_details;
    INSERT INTO telematics.bin_details (asset_id, rfid_tag, bin_type, capacity_l, route_name, collection_frequency,
        lat, lng, created_at, updated_at)
    SELECT pg_temp.it0040_map('core.assets', asset_id), rfid_tag, bin_type, capacity_l, route_name,
           collection_frequency, lat, lng, created_at, updated_at
    FROM core.bin_details;

    -- Row counts: every old row has a new row.
    FOR r IN SELECT * FROM (VALUES
        ('core.companies', 'gps.company'), ('core.sites', 'gps.branch'), ('core.asset_groups', 'gps.asset_group'),
        ('core.users', 'gps.app_user'), ('core.device_models', 'gps.device_model'),
        ('core.assets', 'gps.tracked_asset'), ('core.connectivity', 'gps.sim_card'),
        ('core.device_units', 'gps.device'), ('core.networks', 'telematics.networks'),
        ('core.data_points', 'telematics.data_points'), ('core.device_data_points', 'telematics.device_data_points'),
        ('core.sensor_data_points', 'telematics.sensor_data_points'), ('core.certificates', 'telematics.certificates'),
        ('core.generator_details', 'telematics.generator_details'),
        ('core.telecom_site_details', 'telematics.telecom_site_details'),
        ('core.room_details', 'telematics.room_details'), ('core.dispenser_details', 'telematics.dispenser_details'),
        ('core.inventory_item_details', 'telematics.inventory_item_details'),
        ('core.bin_details', 'telematics.bin_details')) v(o, n)
    LOOP
        EXECUTE format('SELECT count(*) FROM %s', r.o) INTO n_old;
        EXECUTE format('SELECT count(*) FROM %s', r.n) INTO n_new;
        IF n_new < n_old THEN
            RAISE EXCEPTION 'IT-0040: % has % rows but % only %', r.o, n_old, r.n, n_new;
        END IF;
    END LOOP;

    -- ------------------------------------------------------------------ 3. move every link to the new tables
    FOR r IN
        SELECT k.conname, k.conrelid::regclass::text AS tbl, a.attname AS col, k.confrelid::regclass::text AS old_t,
               k.confdeltype
        FROM pg_constraint k
        JOIN pg_attribute a ON a.attrelid = k.conrelid AND a.attnum = k.conkey[1]
        WHERE k.contype = 'f'
          AND k.confrelid::regclass::text = ANY (moved)
          AND k.conrelid::regclass::text <> ALL (dropped)
    LOOP
        new_t := targets[array_position(moved, r.old_t)];
        EXECUTE format('ALTER TABLE %s DROP CONSTRAINT %I', r.tbl, r.conname);
        IF new_t LIKE 'gps.%' THEN
            EXECUTE format('ALTER TABLE %s ALTER COLUMN %I TYPE bigint USING pg_temp.it0040_map(%L, %I)',
                           r.tbl, r.col, r.old_t, r.col);
        END IF;
        EXECUTE format('ALTER TABLE %s ADD CONSTRAINT %I FOREIGN KEY (%I) REFERENCES %s (id)%s DEFERRABLE INITIALLY DEFERRED',
                       r.tbl, r.conname, r.col, new_t,
                       CASE r.confdeltype WHEN 'c' THEN ' ON DELETE CASCADE' WHEN 'n' THEN ' ON DELETE SET NULL' ELSE '' END);
    END LOOP;

    -- Links without a foreign key
    ALTER TABLE core.hardware_prices ALTER COLUMN model_id TYPE bigint
        USING CASE model_kind WHEN 'Sensor' THEN pg_temp.it0040_sensor_no(model_id)
                              ELSE pg_temp.it0040_map('core.device_models', model_id) END;
    UPDATE core.subscriptions s SET buyer_id = m.new_id::text
    FROM it0040_id_map m WHERE m.old_table = 'core.companies' AND m.old_id = s.buyer_id;
    UPDATE core.subscriptions s SET seller_id = m.new_id::text
    FROM it0040_id_map m WHERE m.old_table = 'core.companies' AND m.old_id = s.seller_id;
    UPDATE core.support_sessions s SET target_account_id = m.new_id::text
    FROM it0040_id_map m
    WHERE s.target_level = 'Company' AND m.old_table = 'core.companies' AND m.old_id = s.target_account_id;

    -- Telemetry id columns (no foreign keys, time series): text -> bigint, like the gps / telematics time series.
    FOR r IN
        SELECT c.table_schema || '.' || c.table_name AS tbl, c.column_name AS col
        FROM information_schema.columns c
        JOIN information_schema.tables t ON t.table_schema = c.table_schema AND t.table_name = c.table_name
        WHERE c.table_schema = 'telemetry' AND t.table_type = 'BASE TABLE' AND c.data_type = 'text'
          AND c.column_name IN ('company_id', 'asset_id', 'driver_asset_id', 'device_unit_id', 'reader_unit_id')
          AND (c.table_schema || '.' || c.table_name) <> ALL (dropped)
    LOOP
        EXECUTE format('ALTER TABLE %s ALTER COLUMN %I TYPE bigint USING pg_temp.it0040_map(%L, %I)', r.tbl, r.col,
                       CASE WHEN r.col = 'company_id' THEN 'core.companies'
                            WHEN r.col IN ('asset_id', 'driver_asset_id') THEN 'core.assets'
                            ELSE 'core.device_units' END,
                       r.col);
    END LOOP;

    -- ------------------------------------------------------------------ 4. drop the old tables
    EXECUTE 'DROP TABLE ' || array_to_string(dropped, ', ');

    INSERT INTO public.merge_log (prototype, migration, merged_by, merged_at)
    VALUES ('core', '010_remove_duplicate_tables.sql: old core / telemetry tables copied into gps / telematics and dropped (IT-0040)',
            'Rafiq (admin) via Claude', now());
END $fn$;

SELECT pg_temp.it0040_merge() WHERE to_regclass('core.companies') IS NOT NULL;

-- The prototype roles get the same rights on gps and telematics as on core (read and write rows, no structure
-- changes), so the apps can use the moved tables. Safe to run again.
GRANT USAGE ON SCHEMA gps, telematics TO iotify_prototyper, iotify_dev, iotify_core_admin;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA gps, telematics TO iotify_prototyper, iotify_dev;
GRANT ALL ON ALL TABLES IN SCHEMA gps, telematics TO iotify_core_admin;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA gps, telematics, core TO iotify_prototyper, iotify_dev, iotify_core_admin;
ALTER DEFAULT PRIVILEGES IN SCHEMA gps, telematics GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO iotify_prototyper, iotify_dev;
ALTER DEFAULT PRIVILEGES IN SCHEMA gps, telematics GRANT USAGE, SELECT ON SEQUENCES TO iotify_prototyper, iotify_dev;
