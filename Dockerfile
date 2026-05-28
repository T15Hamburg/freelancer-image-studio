FROM node:22-alpine

WORKDIR /app

COPY package.json ./
COPY server.js ./
COPY public ./public
COPY data/generated/.gitkeep ./data/generated/.gitkeep

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=4173
ENV DATA_DIR=/data

RUN mkdir -p /data/generated

EXPOSE 4173

CMD ["node", "server.js"]
