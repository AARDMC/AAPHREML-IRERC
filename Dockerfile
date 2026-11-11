FROM node:22-alpine
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY . .
RUN npm run build
ENV NODE_ENV=production
# Settings-saved Drive credentials live here; mount a volume to persist them.
ENV IRERC_DATA_DIR=/app/.data
EXPOSE 8080
CMD ["node", ".output/server/index.mjs"]
