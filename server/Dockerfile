FROM node:20-bullseye

WORKDIR /app

# Install mediasoup dependencies
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
RUN npm ci --production=false

COPY tsconfig.json ./
COPY src ./src

RUN npx tsc

EXPOSE 3001
EXPOSE 10000-10100/udp
EXPOSE 10000-10100/tcp

CMD ["node", "dist/index.js"]
