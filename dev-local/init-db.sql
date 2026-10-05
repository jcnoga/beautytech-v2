-- Banco do GoTrue local (mesmo desenho da VPS: papel próprio e schema auth).
CREATE ROLE gotrue_local LOGIN PASSWORD 'local';
ALTER ROLE gotrue_local SET search_path = auth;
CREATE DATABASE gotrue_local OWNER gotrue_local;
\connect gotrue_local
CREATE SCHEMA IF NOT EXISTS auth AUTHORIZATION gotrue_local;
