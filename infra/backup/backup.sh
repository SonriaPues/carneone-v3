#!/bin/sh
# Copia de seguridad diaria de la base de datos completa (numeral 3.6),
# incluyendo los cuatro esquemas (pedidos, inventario, admin, prediccion).
# Uso: ejecutar dentro de un cron del host o de un contenedor programado,
# con las mismas variables de entorno que usa docker-compose.yml.
#
#   0 3 * * *  /ruta/al/repo/infra/backup/backup.sh >> /var/log/carneone-backup.log 2>&1
#
# Retención: 7 copias diarias + 4 semanales (numeral 3.6 / RNF-25).

set -eu

BACKUP_DIR="${BACKUP_DIR:-/var/backups/carneone}"
CONTAINER="${POSTGRES_CONTAINER:-carneone-postgres-1}"
DB_USER="${POSTGRES_USER:-carneone}"
DB_NAME="${POSTGRES_DB:-carneone}"
FECHA=$(date +%Y-%m-%d_%H%M)
DIA_SEMANA=$(date +%u) # 1=lunes ... 7=domingo

mkdir -p "$BACKUP_DIR/diarios" "$BACKUP_DIR/semanales"

ARCHIVO="$BACKUP_DIR/diarios/carneone_${FECHA}.sql.gz"
docker exec "$CONTAINER" pg_dump -U "$DB_USER" "$DB_NAME" | gzip > "$ARCHIVO"
echo "Backup creado: $ARCHIVO"

# Domingo: además conserva una copia semanal.
if [ "$DIA_SEMANA" = "7" ]; then
  cp "$ARCHIVO" "$BACKUP_DIR/semanales/carneone_semana_${FECHA}.sql.gz"
fi

# Retención: conserva solo los 7 backups diarios y 4 semanales más recientes.
ls -1t "$BACKUP_DIR/diarios"/*.sql.gz   2>/dev/null | tail -n +8 | xargs -r rm --
ls -1t "$BACKUP_DIR/semanales"/*.sql.gz 2>/dev/null | tail -n +5 | xargs -r rm --

echo "Retención aplicada: $(ls "$BACKUP_DIR/diarios" | wc -l) diarios, $(ls "$BACKUP_DIR/semanales" | wc -l) semanales."
