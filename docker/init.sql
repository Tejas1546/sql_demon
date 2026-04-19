CREATE TABLE IF NOT EXISTS users (
    id          SERIAL PRIMARY KEY,
    created_at  TIMESTAMPTZ NOT NULL,
    created_by  INTEGER     NOT NULL,
    updated_at  TIMESTAMPTZ NOT NULL,
    updated_by  INTEGER     NOT NULL,
    name        TEXT        NOT NULL,
    address     TEXT        NOT NULL,
    dob         TIMESTAMPTZ NOT NULL,
    email       TEXT        NOT NULL
);

CREATE TABLE IF NOT EXISTS employees (
    id          SERIAL PRIMARY KEY,
    created_at  TIMESTAMPTZ NOT NULL,
    created_by  INTEGER     NOT NULL,
    updated_at  TIMESTAMPTZ NOT NULL,
    updated_by  INTEGER     NOT NULL,
    name        TEXT        NOT NULL,
    position    TEXT        NOT NULL,
    department  TEXT        NOT NULL,
    salary      NUMERIC     NOT NULL
);
