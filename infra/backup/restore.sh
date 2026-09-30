#!/bin/sh
# Procedimiento de restauración a partir de un backup (numeral 3.6).
# Uso: ./restore.sh /ruta/al/backup.sql.gz
set -eu

ARCHIVO="${1:?Uso: restore.sh <archivo.sql.gz>}"
CONTAINER="${POSTGRES_CONTAINER:-carneone-postgres-1}"
DB_USER="${POSTGRES_USER:-carneone}"
DB_NAME="${POSTGRES_DB:-carneone}"

echo "Restaurando $ARCHIVO en la base $DB_NAME (contenedor $CONTAINER)..."
gunzip -c "$ARCHIVO" | docker exec -i "$CONTAINER" psql -U "$DB_USER" "$DB_NAME"
echo "Restauración completa."
