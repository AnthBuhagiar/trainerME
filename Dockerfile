# Hour Power for a host with a persistent disk (Railway, Fly.io, Render...).
# Personal data lives on the volume mounted at /data; nothing personal is in the image.
FROM node:20-bookworm-slim
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY . .
RUN npx next build
ENV NODE_ENV=production
ENV TRAINERME_DATA_DIR=/data
EXPOSE 3000
CMD ["sh", "-c", "npx next start -H 0.0.0.0 -p ${PORT:-3000}"]
