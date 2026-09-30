# Build del frontend (numeral 3.6): se compila aquí y el Gateway lo sirve
# como archivos estáticos, tal como hacía el backend monolítico original.
FROM node:20-alpine AS frontend-build
WORKDIR /frontend
COPY frontend/package.json frontend/package-lock.json* ./
RUN npm install
COPY frontend/ ./
RUN npm run build

FROM node:20-alpine
WORKDIR /app
COPY services/gateway/package.json ./
RUN npm install --omit=dev
COPY services/gateway/src ./src
COPY --from=frontend-build /frontend/build /frontend/build
EXPOSE 4000
CMD ["node", "src/index.js"]
