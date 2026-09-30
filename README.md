# Carneone v4 — MVP de gestión de pedidos, inventario y predicción de demanda

Sistema desarrollado para el Restaurante Carneone (Bogotá) como Trabajo de
Grado. Esta versión implementa la arquitectura de microservicios definida en
el Objetivo 2 del documento (numeral 3.1), a diferencia de la versión previa
(`legacy/`), que consolidaba pedidos, inventario y panel administrativo en un
único backend.

## Arquitectura

```
                        ┌──────────────┐
   clientes web ───────▶│  API Gateway │──────────▶ frontend/build (estático)
 (mesero/cocina/         └──────┬───────┘
  caja/admin)                   │ REST + WS
              ┌──────────────────┼──────────────────┬───────────────────┐
              ▼                  ▼                  ▼                   ▼
      pedidos-service   inventario-service   admin-service     prediccion-service
      (Node/Express)      (Node/Express)     (Node/Express)      (Python/FastAPI)
      esquema: pedidos    esquema: inventario esquema: admin      esquema: prediccion
              │                  ▲                  ▲                   ▲
              └──── REST interno ┴──────────────────┴───── REST interno ┘
                          (header x-internal-key)
                                  │
                          PostgreSQL (una instancia, 4 esquemas)
```

Cada microservicio es dueño exclusivo de su esquema (numeral 3.2): ningún
servicio consulta la base de datos de otro directamente. Las referencias
cruzadas —validar el menú al crear un pedido, descontar inventario al
entregarlo, leer el historial de ventas para el panel y para el modelo
predictivo— se resuelven por REST síncrono a un endpoint `/internal/...`
protegido por un secreto compartido (`INTERNAL_KEY`), nunca por acceso
directo a las tablas de otro esquema (numeral 3.2/3.3).

| Servicio | Puerto | Esquema | Responsabilidad |
|---|---|---|---|
| `gateway` | 4000 | — | único punto de entrada; enruta y sirve el frontend |
| `pedidos-service` | 4001 | `pedidos` | mesas, pedidos, WebSocket `/ws/cocina`, turnos |
| `inventario-service` | 4002 | `inventario` | stock, movimientos, alertas, descuento por venta |
| `admin-service` | 4003 | `admin` | auth (JWT), usuarios, menú, histórico |
| `prediccion-service` | 8000 | `prediccion` | predicción de demanda, recomendación de compra |

## Correr en local (sin Docker)

Requiere Node 20+, Python 3.11+ y una instancia de PostgreSQL accesible.

```bash
cp .env.example .env            # completar POSTGRES_PASSWORD, JWT_SECRET, INTERNAL_KEY...
# JWT_SECRET e INTERNAL_KEY deben ser el MISMO valor en los 4 servicios backend.

for s in admin-service inventario-service pedidos-service gateway; do
  (cd services/$s && npm install)
done
(cd services/prediccion-service && python3 -m venv venv && ./venv/bin/pip install -r requirements.txt)
(cd frontend && npm install && npm run build)

# arrancar cada servicio (una terminal por servicio, o con un gestor como pm2/concurrently)
(cd services/admin-service      && npm start)   # :4003
(cd services/inventario-service && npm start)   # :4002
(cd services/pedidos-service    && npm start)   # :4001
(cd services/prediccion-service && ./venv/bin/uvicorn main:app --port 8000)
(cd services/gateway            && npm start)   # :4000  <- entra por aquí
```

`GET http://localhost:4000/health` responde con el estado agregado de los
cuatro microservicios.

## Correr con Docker

```bash
cp .env.example .env    # completar los mismos valores
docker compose up -d --build
```

Levanta PostgreSQL, los cuatro microservicios, el Gateway y Nginx como proxy
inverso (puertos 80/443, numeral 3.6). Para HTTPS con Let's Encrypt en un
servidor real, reemplazar `${DOMAIN}` en `infra/nginx/nginx.conf` y ejecutar
certbot la primera vez (ver comentarios en ese archivo); el contenedor
`certbot` del `docker-compose.yml` se encarga de la renovación automática.

## Infraestructura adicional (numeral 3.6)

- `infra/backup/backup.sh` y `restore.sh`: respaldo diario (`pg_dump`) de los
  4 esquemas y procedimiento de restauración, con la política de retención
  de 7 copias diarias + 4 semanales.
- `.github/workflows/deploy.yml`: build de las 5 imágenes en cada push a
  `main`, y despliegue por SSH si se configuran los secrets
  `DEPLOY_HOST`/`DEPLOY_USER`/`DEPLOY_KEY` del repositorio.

## Qué cambió respecto a la versión anterior (`legacy/`)

Ver el detalle y la justificación de cada decisión en el numeral 4.6 y la
Tabla 9 del documento de tesis. En resumen: se dividió el backend monolítico
en 3 microservicios (antes 1) + el servicio de predicción (que ya estaba
separado); se creó un esquema de PostgreSQL por servicio (antes uno
compartido); el servicio de predicción dejó de consultar `turnos` e
`inventario` directamente y ahora lo hace por REST; y se agregó el API
Gateway como único punto de entrada.
