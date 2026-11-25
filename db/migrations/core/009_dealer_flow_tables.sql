-- Step 2 of 3: the tables the Dealer Flow added (Neon iotify-prototypes, main, DDL of 2026-11-25) that have no
-- counterpart in assettracking, created in core / telematics, plus the dealer columns on existing tables.
-- Run once as gps_owner after V20261125_1000__core_telematics_schemas.sql. Safe to run again.
-- Does not touch existing data and does not break running services: it can run before step 3.
--
-- Conventions
--   * Ids of these new tables are text, as in the Dealer Flow, so its rows can be copied unchanged.
--   * A column that points to an EXISTING table is bigint, like that table's id:
--       gps.company, gps.app_user, gps.tracked_asset, gps.device, gps.device_model.
--     The foreign keys follow those tables when step 3 moves them to core / telematics.
--   * Value lists (CHECK) are the Dealer Flow's (Title case), not the UPPER case of the existing gps tables.
--   * Columns marked "no FK yet" point to tables whose key in assettracking is not confirmed
--     (sensor_type, floor_plan/zones, sites/branch) or that point to more than one table (dealer or company).
--
-- Prototype note (IT-0040): this is V20261125_1100__dealer_flow_tables.sql, unchanged. In the prototype it runs
-- after 008_gps_schema.sql, which creates schema gps (the tables linked below) and schema telematics (step 1).

-- =====================================================================================================  core

-- Dealers (resellers, white-label resellers). Was company.parent_company_id + company_branding.
CREATE TABLE IF NOT EXISTS core.dealers (
    id                   text PRIMARY KEY,
    name                 text,
    country              text,
    contact              text,
    status               text CHECK (status IN ('Active', 'Suspended')),
    reseller_type        text NOT NULL DEFAULT 'Reseller' CHECK (reseller_type IN ('Reseller', 'White-label reseller')),
    brand_name           text,
    brand_logo           text,
    brand_color          text,
    support_access_until date,
    created_at           timestamptz NOT NULL DEFAULT now(),
    updated_at           timestamptz NOT NULL DEFAULT now()
);

-- Dealer columns on existing tables.
ALTER TABLE gps.company ADD COLUMN IF NOT EXISTS dealer_id text REFERENCES core.dealers (id) DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE gps.company ADD COLUMN IF NOT EXISTS support_access_until date;
CREATE INDEX IF NOT EXISTS company_dealer_id_idx ON gps.company (dealer_id);

ALTER TABLE IF EXISTS gps.device ADD COLUMN IF NOT EXISTS owner_dealer_id text REFERENCES core.dealers (id) DEFERRABLE INITIALLY DEFERRED;
CREATE INDEX IF NOT EXISTS device_owner_dealer_id_idx ON gps.device (owner_dealer_id);

ALTER TABLE IF EXISTS gps.sim_card ADD COLUMN IF NOT EXISTS owner_dealer_id text REFERENCES core.dealers (id) DEFERRABLE INITIALLY DEFERRED;

-- Generic pick-lists.
CREATE TABLE IF NOT EXISTS core.lookups (
    id         text PRIMARY KEY,
    list       text,
    value      text,
    sort       numeric,
    active     boolean,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (list, value)
);

-- Product tree: groups and products. Replaces solution_code (VEHICLE, EMPLOYEE, ...) as "product_id".
CREATE TABLE IF NOT EXISTS core.nodes (
    id                     text PRIMARY KEY,
    parent_id              text REFERENCES core.nodes (id) DEFERRABLE INITIALLY DEFERRED,
    type                   text CHECK (type IN ('Group', 'Product')),
    name                   text,
    code                   text,
    kind                   text,
    status                 text CHECK (status IN ('Active', 'Deferred', 'Inactive')),
    sort                   numeric,
    requires_certification text,
    markets                text,
    created_at             timestamptz NOT NULL DEFAULT now(),
    updated_at             timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS nodes_parent_id_idx ON core.nodes (parent_id);

-- Capabilities a product can have (and roles can be given).
CREATE TABLE IF NOT EXISTS core.features (
    id            text PRIMARY KEY,
    feature_group text,
    name          text,
    is_command    boolean,
    status        text CHECK (status IN ('Active', 'Deferred', 'Inactive')),
    type          text,
    latency_need  text,
    created_at    timestamptz NOT NULL DEFAULT now(),
    updated_at    timestamptz NOT NULL DEFAULT now()
);

-- Asset type catalogue. Map each row to the gps.tracked_asset.asset_type codes (VEHICLE, EMPLOYEE, ATM, ...).
CREATE TABLE IF NOT EXISTS core.asset_types (
    id         text PRIMARY KEY,
    name       text,
    category   text CHECK (category IN ('Movable', 'Person', 'Fixed site', 'Inventory item', 'Camera view')),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS core.product_features (
    id           text PRIMARY KEY,
    product_id   text REFERENCES core.nodes (id) DEFERRABLE INITIALLY DEFERRED,
    feature_id   text REFERENCES core.features (id) DEFERRABLE INITIALLY DEFERRED,
    availability text CHECK (availability IN ('Standard', 'Optional')),
    created_at   timestamptz NOT NULL DEFAULT now(),
    updated_at   timestamptz NOT NULL DEFAULT now(),
    UNIQUE (product_id, feature_id)
);
CREATE INDEX IF NOT EXISTS product_features_feature_id_idx ON core.product_features (feature_id);

CREATE TABLE IF NOT EXISTS core.product_devices (
    id              text PRIMARY KEY,
    product_id      text REFERENCES core.nodes (id) DEFERRABLE INITIALLY DEFERRED,
    device_model_id bigint REFERENCES gps.device_model (id) DEFERRABLE INITIALLY DEFERRED,
    priority        numeric,
    created_at      timestamptz NOT NULL DEFAULT now(),
    updated_at      timestamptz NOT NULL DEFAULT now(),
    UNIQUE (product_id, priority)
);
CREATE INDEX IF NOT EXISTS product_devices_device_model_id_idx ON core.product_devices (device_model_id);

CREATE TABLE IF NOT EXISTS core.product_asset_types (
    id            text PRIMARY KEY,
    product_id    text REFERENCES core.nodes (id) DEFERRABLE INITIALLY DEFERRED,
    asset_type_id text REFERENCES core.asset_types (id) DEFERRABLE INITIALLY DEFERRED,
    created_at    timestamptz NOT NULL DEFAULT now(),
    updated_at    timestamptz NOT NULL DEFAULT now(),
    UNIQUE (product_id, asset_type_id)
);
CREATE INDEX IF NOT EXISTS product_asset_types_asset_type_id_idx ON core.product_asset_types (asset_type_id);

CREATE TABLE IF NOT EXISTS core.bundle_rules (
    id           text PRIMARY KEY,
    from_product text REFERENCES core.nodes (id) DEFERRABLE INITIALLY DEFERRED,
    type         text CHECK (type IN ('Includes', 'Needs', 'Optional')),
    to_product   text REFERENCES core.nodes (id) DEFERRABLE INITIALLY DEFERRED,
    created_at   timestamptz NOT NULL DEFAULT now(),
    updated_at   timestamptz NOT NULL DEFAULT now(),
    UNIQUE (from_product, type, to_product)
);
CREATE INDEX IF NOT EXISTS bundle_rules_to_product_idx ON core.bundle_rules (to_product);

CREATE TABLE IF NOT EXISTS core.price_plans (
    id         text PRIMARY KEY,
    product_id text REFERENCES core.nodes (id) DEFERRABLE INITIALLY DEFERRED,
    sold_to    text CHECK (sold_to IN ('Dealer', 'Company')),
    base_price numeric,
    period     text CHECK (period IN ('Month', 'Year')),
    currency   text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (product_id, sold_to)
);

CREATE TABLE IF NOT EXISTS core.price_rules (
    id         text PRIMARY KEY,
    plan_id    text REFERENCES core.price_plans (id) DEFERRABLE INITIALLY DEFERRED,
    rule_type  text CHECK (rule_type IN ('Tier', 'Quantity band', 'Asset type', 'Feature add-on', 'Item count band',
                                         'Package discount')),
    condition  text,
    effect     text CHECK (effect IN ('Replace', 'Add', 'Discount %')),
    value      numeric,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS price_rules_plan_id_idx ON core.price_rules (plan_id);

-- model_id: gps.device_model.id or a sensor model id, by model_kind (no FK).
CREATE TABLE IF NOT EXISTS core.hardware_prices (
    id              text PRIMARY KEY,
    model_kind      text CHECK (model_kind IN ('Device', 'Sensor')),
    model_id        bigint,
    sold_to         text CHECK (sold_to IN ('Dealer', 'Company')),
    supply          text CHECK (supply IN ('Sold', 'Rented', 'Free with minimum term', 'Customer provided')),
    price           numeric,
    min_term_months numeric,
    currency        text,
    created_at      timestamptz NOT NULL DEFAULT now(),
    updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS core.quotes (
    id          text PRIMARY KEY,
    dealer_id   text REFERENCES core.dealers (id) DEFERRABLE INITIALLY DEFERRED,
    company_id  bigint REFERENCES gps.company (id) DEFERRABLE INITIALLY DEFERRED,
    crm_id      text,
    version     numeric,
    valid_until date,
    status      text CHECK (status IN ('Draft', 'Sent', 'Accepted', 'Lost')),
    created_at  timestamptz NOT NULL DEFAULT now(),
    updated_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS quotes_dealer_id_idx ON core.quotes (dealer_id);
CREATE INDEX IF NOT EXISTS quotes_company_id_idx ON core.quotes (company_id);

CREATE TABLE IF NOT EXISTS core.quote_lines (
    id              text PRIMARY KEY,
    quote_id        text REFERENCES core.quotes (id) DEFERRABLE INITIALLY DEFERRED,
    kind            text CHECK (kind IN ('Product', 'Hardware')),
    item_id         text,
    heading         text,
    tier            text,
    asset_type_id   text REFERENCES core.asset_types (id) DEFERRABLE INITIALLY DEFERRED,
    supply          text CHECK (supply IN ('Sold', 'Rented', 'Free with minimum term', 'Customer provided')),
    min_term_months numeric,
    qty             numeric,
    unit_price      numeric,
    rules_applied   text,
    edition_choice  text REFERENCES core.nodes (id) DEFERRABLE INITIALLY DEFERRED,
    item_count      numeric,
    package_id      text REFERENCES core.nodes (id) DEFERRABLE INITIALLY DEFERRED,
    created_at      timestamptz NOT NULL DEFAULT now(),
    updated_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS quote_lines_quote_id_idx ON core.quote_lines (quote_id);

-- What a dealer or company bought. seller_id / buyer_id: a dealer id or a company id, as text (no FK yet).
-- Overlaps gps.company_solution / company_feature: decide which one the platform keeps.
CREATE TABLE IF NOT EXISTS core.subscriptions (
    id              text PRIMARY KEY,
    seller_id       text,
    buyer_id        text,
    product_id      text REFERENCES core.nodes (id) DEFERRABLE INITIALLY DEFERRED,
    plan_id         text REFERENCES core.price_plans (id) DEFERRABLE INITIALLY DEFERRED,
    asset_id        bigint REFERENCES gps.tracked_asset (id) DEFERRABLE INITIALLY DEFERRED,
    qty             numeric,
    tier            text,
    start           date,
    min_term_months numeric,
    status          text CHECK (status IN ('Trial', 'Active', 'Pending activation', 'Suspended', 'Ended')),
    edition_choice  text REFERENCES core.nodes (id) DEFERRABLE INITIALLY DEFERRED,
    item_count      numeric,
    package_id      text REFERENCES core.nodes (id) DEFERRABLE INITIALLY DEFERRED,
    created_at      timestamptz NOT NULL DEFAULT now(),
    updated_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS subscriptions_product_id_idx ON core.subscriptions (product_id);
CREATE INDEX IF NOT EXISTS subscriptions_asset_id_idx ON core.subscriptions (asset_id);

-- Support log-ins into a dealer or company account. target_account_id: dealer or company id, as text (no FK).
CREATE TABLE IF NOT EXISTS core.support_sessions (
    id                text PRIMARY KEY,
    actor_user_id     bigint REFERENCES gps.app_user (id),
    target_level      text CHECK (target_level IN ('Dealer', 'Company')),
    target_account_id text NOT NULL,
    product_id        text REFERENCES core.nodes (id),
    reason            text NOT NULL,
    started_at        timestamptz NOT NULL DEFAULT now(),
    ended_at          timestamptz,
    link_opened_at    timestamptz,
    created_at        timestamptz NOT NULL DEFAULT now(),
    updated_at        timestamptz NOT NULL DEFAULT now()
);
COMMENT ON COLUMN core.support_sessions.link_opened_at IS
    'When the support link was opened. A link works once: a second opening is refused.';

-- ===============================================================================================  telematics

-- Network catalogue (cellular, LoRaWAN, Sigfox, satellite, ...).
CREATE TABLE IF NOT EXISTS telematics.networks (
    id                       text PRIMARY KEY,
    name                     text,
    category                 text CHECK (category IN ('Cellular', 'Cellular LPWA', 'LPWAN', 'Satellite', 'Short range',
                                                      'Local', 'Wired', 'Via host')),
    needs                    text CHECK (needs IN ('Operator coverage', 'Own gateway', 'Site network', 'Host device',
                                                   'Sky view', 'None')),
    downlink                 text CHECK (downlink IN ('Full', 'Limited', 'Very limited', 'None')),
    real_time                boolean,
    typical_interval_seconds numeric,
    markets                  text,
    connectivity_fee         boolean,
    identifier_type          text CHECK (identifier_type IN ('ICCID', 'DevEUI', 'Sigfox ID', 'Terminal ID', 'None')),
    notes                    text,
    status                   text CHECK (status IN ('Active', 'Deferred', 'Inactive')),
    created_at               timestamptz NOT NULL DEFAULT now(),
    updated_at               timestamptz NOT NULL DEFAULT now()
);

-- Measured or commanded quantities (fuel level, temperature, ...).
CREATE TABLE IF NOT EXISTS telematics.data_points (
    id         text PRIMARY KEY,
    name       text,
    unit       text,
    direction  text CHECK (direction IN ('In', 'Out')),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- Which data points a feature needs (catalogue; core feature -> telematics data point).
CREATE TABLE IF NOT EXISTS core.feature_data_points (
    id            text PRIMARY KEY,
    feature_id    text REFERENCES core.features (id) DEFERRABLE INITIALLY DEFERRED,
    data_point_id text REFERENCES telematics.data_points (id) DEFERRABLE INITIALLY DEFERRED,
    required      boolean,
    alt_group     text,
    created_at    timestamptz NOT NULL DEFAULT now(),
    updated_at    timestamptz NOT NULL DEFAULT now(),
    UNIQUE (feature_id, data_point_id)
);
CREATE INDEX IF NOT EXISTS feature_data_points_data_point_id_idx ON core.feature_data_points (data_point_id);

CREATE TABLE IF NOT EXISTS telematics.device_data_points (
    id              text PRIMARY KEY,
    device_model_id bigint REFERENCES gps.device_model (id) DEFERRABLE INITIALLY DEFERRED,
    data_point_id   text REFERENCES telematics.data_points (id) DEFERRABLE INITIALLY DEFERRED,
    created_at      timestamptz NOT NULL DEFAULT now(),
    updated_at      timestamptz NOT NULL DEFAULT now(),
    UNIQUE (device_model_id, data_point_id)
);
CREATE INDEX IF NOT EXISTS device_data_points_data_point_id_idx ON telematics.device_data_points (data_point_id);

-- sensor_model_id: gps.sensor_type.id (no FK yet).
CREATE TABLE IF NOT EXISTS telematics.sensor_data_points (
    id              text PRIMARY KEY,
    sensor_model_id bigint,
    data_point_id   text REFERENCES telematics.data_points (id) DEFERRABLE INITIALLY DEFERRED,
    created_at      timestamptz NOT NULL DEFAULT now(),
    updated_at      timestamptz NOT NULL DEFAULT now(),
    UNIQUE (sensor_model_id, data_point_id)
);
CREATE INDEX IF NOT EXISTS sensor_data_points_data_point_id_idx ON telematics.sensor_data_points (data_point_id);

-- Fitment / type-approval certificates (e.g. AIS 140).
CREATE TABLE IF NOT EXISTS telematics.certificates (
    id             text PRIMARY KEY,
    asset_id       bigint REFERENCES gps.tracked_asset (id) DEFERRABLE INITIALLY DEFERRED,
    device_unit_id bigint REFERENCES gps.device (id) DEFERRABLE INITIALLY DEFERRED,
    certification  text,
    certificate_no text,
    issued_by      text,
    issued_on      date,
    valid_until    date,
    status         text CHECK (status IN ('Pending', 'Issued', 'Expired', 'Rejected')),
    created_at     timestamptz NOT NULL DEFAULT now(),
    updated_at     timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS certificates_asset_id_idx ON telematics.certificates (asset_id);
CREATE INDEX IF NOT EXISTS certificates_device_unit_id_idx ON telematics.certificates (device_unit_id);

-- Detail tables: one row per tracked asset of that kind (asset_id = gps.tracked_asset.id).

CREATE TABLE IF NOT EXISTS telematics.generator_details (
    asset_id             bigint PRIMARY KEY REFERENCES gps.tracked_asset (id) ON DELETE CASCADE DEFERRABLE INITIALLY DEFERRED,
    make                 text,
    model                text,
    rating_kva           numeric CHECK (rating_kva IS NULL OR rating_kva > 0),
    phase                text CHECK (phase IN ('Single', 'Three')),
    fuel_tank_l          numeric CHECK (fuel_tank_l IS NULL OR fuel_tank_l >= 0),
    engine_serial        text,
    alternator_serial    text,
    install_date         date,
    run_hours_at_install numeric CHECK (run_hours_at_install IS NULL OR run_hours_at_install >= 0),
    service_interval_h   numeric CHECK (service_interval_h IS NULL OR service_interval_h > 0),
    last_service_date    date,
    created_at           timestamptz NOT NULL DEFAULT now(),
    updated_at           timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS telematics.telecom_site_details (
    asset_id        bigint PRIMARY KEY REFERENCES gps.tracked_asset (id) ON DELETE CASCADE DEFERRABLE INITIALLY DEFERRED,
    site_code       text,
    tower_type      text CHECK (tower_type IN ('Greenfield', 'Rooftop', 'Monopole', 'Small cell', 'Other')),
    operator_name   text,
    tenant_count    integer CHECK (tenant_count IS NULL OR tenant_count >= 0),
    grid_connected  boolean,
    has_generator   boolean,
    battery_bank_ah numeric CHECK (battery_bank_ah IS NULL OR battery_bank_ah >= 0),
    rectifier_model text,
    lat             numeric,
    lng             numeric,
    created_at      timestamptz NOT NULL DEFAULT now(),
    updated_at      timestamptz NOT NULL DEFAULT now()
);

-- zone_id: floor plan / zone id (no FK yet: zones are not in assettracking).
CREATE TABLE IF NOT EXISTS telematics.room_details (
    asset_id         bigint PRIMARY KEY REFERENCES gps.tracked_asset (id) ON DELETE CASCADE DEFERRABLE INITIALLY DEFERRED,
    room_type        text CHECK (room_type IN ('Data centre', 'Server room', 'UPS room', 'Battery room', 'Cold room', 'Other')),
    zone_id          bigint,
    area_m2          numeric CHECK (area_m2 IS NULL OR area_m2 > 0),
    rack_count       integer CHECK (rack_count IS NULL OR rack_count >= 0),
    temp_min_c       numeric,
    temp_max_c       numeric,
    humidity_min_pct numeric CHECK (humidity_min_pct IS NULL OR humidity_min_pct BETWEEN 0 AND 100),
    humidity_max_pct numeric CHECK (humidity_max_pct IS NULL OR humidity_max_pct BETWEEN 0 AND 100),
    created_at       timestamptz NOT NULL DEFAULT now(),
    updated_at       timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS telematics.dispenser_details (
    asset_id          bigint PRIMARY KEY REFERENCES gps.tracked_asset (id) ON DELETE CASCADE DEFERRABLE INITIALLY DEFERRED,
    make              text,
    model             text,
    nozzle_count      integer CHECK (nozzle_count IS NULL OR nozzle_count > 0),
    product           text CHECK (product IN ('Diesel', 'Petrol', 'Other')),
    tank_asset_id     bigint REFERENCES gps.tracked_asset (id) ON DELETE SET NULL DEFERRABLE INITIALLY DEFERRED,
    totaliser_start_l numeric CHECK (totaliser_start_l IS NULL OR totaliser_start_l >= 0),
    unit_price        numeric CHECK (unit_price IS NULL OR unit_price >= 0),
    created_at        timestamptz NOT NULL DEFAULT now(),
    updated_at        timestamptz NOT NULL DEFAULT now()
);

-- zone_id: as room_details (no FK yet).
CREATE TABLE IF NOT EXISTS telematics.inventory_item_details (
    asset_id    bigint PRIMARY KEY REFERENCES gps.tracked_asset (id) ON DELETE CASCADE DEFERRABLE INITIALLY DEFERRED,
    sku         text,
    epc         text,
    batch_no    text,
    quantity    numeric CHECK (quantity IS NULL OR quantity >= 0),
    unit        text,
    zone_id     bigint,
    expiry_date date,
    created_at  timestamptz NOT NULL DEFAULT now(),
    updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS telematics.bin_details (
    asset_id             bigint PRIMARY KEY REFERENCES gps.tracked_asset (id) ON DELETE CASCADE DEFERRABLE INITIALLY DEFERRED,
    rfid_tag             text,
    bin_type             text CHECK (bin_type IN ('General', 'Recycle', 'Organic', 'Hazardous')),
    capacity_l           numeric CHECK (capacity_l IS NULL OR capacity_l > 0),
    route_name           text,
    collection_frequency text CHECK (collection_frequency IN ('Daily', 'Twice a week', 'Weekly', 'On demand')),
    lat                  numeric,
    lng                  numeric,
    created_at           timestamptz NOT NULL DEFAULT now(),
    updated_at           timestamptz NOT NULL DEFAULT now()
);

-- Time series. No foreign keys (as the other position / reading tables); company_id has row-level security.

CREATE TABLE IF NOT EXISTS telematics.rfid_reads (
    company_id     bigint NOT NULL,
    reader_unit_id bigint NOT NULL,                    -- gps.device.id of the reader
    tag            text NOT NULL,
    asset_id       bigint,                             -- gps.tracked_asset.id, when the tag is known
    product_id     text,                               -- core.nodes.id
    ts             timestamptz NOT NULL,
    received_at    timestamptz NOT NULL DEFAULT now(),
    antenna        integer,
    rssi           double precision,
    direction      text,
    zone_id        bigint,
    is_demo        boolean NOT NULL DEFAULT false,
    PRIMARY KEY (company_id, reader_unit_id, tag, ts)
);
SELECT create_hypertable('telematics.rfid_reads', 'ts', chunk_time_interval => INTERVAL '1 day', if_not_exists => TRUE);
CREATE INDEX IF NOT EXISTS rfid_reads_ts_idx ON telematics.rfid_reads (ts DESC);

-- Latest running / stopped / fault state per IoT asset (one row per asset).
CREATE TABLE IF NOT EXISTS telematics.iot_live_states (
    asset_id       bigint PRIMARY KEY,                 -- gps.tracked_asset.id
    company_id     bigint NOT NULL,
    asset_type_id  text NOT NULL,                      -- core.asset_types.id
    product_id     text,
    device_unit_id bigint,
    ts             timestamptz NOT NULL,
    received_at    timestamptz NOT NULL DEFAULT now(),
    status         text,
    status_since   timestamptz,
    is_demo        boolean NOT NULL DEFAULT false
);
CREATE INDEX IF NOT EXISTS iot_live_states_company_idx ON telematics.iot_live_states (company_id);

-- Min / max / average / last per data point per hour.
CREATE TABLE IF NOT EXISTS telematics.reading_hourly_summaries (
    company_id    bigint NOT NULL,
    asset_id      bigint NOT NULL,
    asset_type_id text NOT NULL,
    product_id    text,
    data_point_id text NOT NULL,                       -- telematics.data_points.id
    channel       text NOT NULL DEFAULT '',
    hour_start    timestamptz NOT NULL,
    min_value     double precision,
    max_value     double precision,
    avg_value     double precision,
    last_value    double precision,
    sample_count  integer,
    is_final      boolean NOT NULL DEFAULT false,
    computed_at   timestamptz NOT NULL DEFAULT now(),
    is_demo       boolean NOT NULL DEFAULT false,
    PRIMARY KEY (company_id, asset_id, data_point_id, channel, hour_start)
);
SELECT create_hypertable('telematics.reading_hourly_summaries', 'hour_start', chunk_time_interval => INTERVAL '7 days',
                         if_not_exists => TRUE);
CREATE INDEX IF NOT EXISTS reading_hourly_summaries_hour_start_idx ON telematics.reading_hourly_summaries (hour_start DESC);

-- Row-level security on the client time series, as on the existing gps tables.
DO $$
DECLARE
    t text;
BEGIN
    FOREACH t IN ARRAY ARRAY['rfid_reads', 'iot_live_states', 'reading_hourly_summaries'] LOOP
        EXECUTE format('ALTER TABLE telematics.%I ENABLE ROW LEVEL SECURITY', t);
        EXECUTE format('ALTER TABLE telematics.%I FORCE ROW LEVEL SECURITY', t);
        IF NOT EXISTS (SELECT 1 FROM pg_policies
                       WHERE schemaname = 'telematics' AND tablename = t AND policyname = 'tenant_isolation') THEN
            EXECUTE format('CREATE POLICY tenant_isolation ON telematics.%I '
                           'USING (company_id = NULLIF(current_setting(''app.company_id'', true), '''')::bigint)', t);
        END IF;
    END LOOP;
END $$;

-- Same table privileges as gps.tracked_asset (master tables) and gps.vehicle_position (time series) have today.
DO $$
DECLARE
    r    record;
    t    text;
    priv text;
BEGIN
    FOR r IN SELECT rolname FROM pg_roles WHERE rolname NOT LIKE 'pg\_%' LOOP
        FOREACH t IN ARRAY ARRAY[
            'core.dealers', 'core.lookups', 'core.nodes', 'core.features', 'core.asset_types', 'core.product_features',
            'core.product_devices', 'core.product_asset_types', 'core.bundle_rules', 'core.price_plans',
            'core.price_rules', 'core.hardware_prices', 'core.quotes', 'core.quote_lines', 'core.subscriptions',
            'core.support_sessions', 'core.feature_data_points', 'telematics.networks', 'telematics.data_points',
            'telematics.device_data_points', 'telematics.sensor_data_points', 'telematics.certificates',
            'telematics.generator_details', 'telematics.telecom_site_details', 'telematics.room_details',
            'telematics.dispenser_details', 'telematics.inventory_item_details', 'telematics.bin_details'] LOOP
            FOREACH priv IN ARRAY ARRAY['SELECT', 'INSERT', 'UPDATE', 'DELETE'] LOOP
                IF has_table_privilege(r.rolname, 'gps.tracked_asset', priv) THEN
                    EXECUTE format('GRANT %s ON %s TO %I', priv, t, r.rolname);
                END IF;
            END LOOP;
        END LOOP;
        FOREACH t IN ARRAY ARRAY['telematics.rfid_reads', 'telematics.iot_live_states',
                                 'telematics.reading_hourly_summaries'] LOOP
            FOREACH priv IN ARRAY ARRAY['SELECT', 'INSERT', 'UPDATE', 'DELETE'] LOOP
                IF has_table_privilege(r.rolname, 'gps.vehicle_position', priv) THEN
                    EXECUTE format('GRANT %s ON %s TO %I', priv, t, r.rolname);
                END IF;
            END LOOP;
        END LOOP;
    END LOOP;
END $$;
