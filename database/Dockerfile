FROM postgres:16-alpine

# Copy PostgreSQL-specific initialization script
COPY init-postgres.sql /docker-entrypoint-initdb.d/init.sql

# Set locale
ENV LANG en_US.utf8

# PostgreSQL image requires the postgres user for system operations
USER postgres

# Add HEALTHCHECK using environment variables
HEALTHCHECK --interval=5s --timeout=5s --start-period=20s --retries=15 \
  CMD pg_isready -U ${POSTGRES_USER} -d ${POSTGRES_DB} || exit 1

