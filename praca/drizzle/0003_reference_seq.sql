-- Human-friendly property references for ingested properties (PR-100001, …). The demo seed uses PR-000001…PR-099999.
CREATE SEQUENCE IF NOT EXISTS property_reference_seq START WITH 100001 MINVALUE 100001;
