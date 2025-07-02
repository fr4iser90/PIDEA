FROM postgres:16-alpine

# Copy initialization scripts
COPY init.sql /docker-entrypoint-initdb.d/
COPY seed.sql /docker-entrypoint-initdb.d/

# Set locale
ENV LANG en_US.utf8

# PostgreSQL image requires the postgres user for system operations
USER postgres

# Add HEALTHCHECK using environment variables
HEALTHCHECK --interval=5s --timeout=5s --start-period=20s --retries=15 \
  CMD pg_isready -U ${POSTGRES_USER} -d ${POSTGRES_DB} || exit 1

