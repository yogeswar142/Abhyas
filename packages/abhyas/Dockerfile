# Bridge Package Dockerfile
FROM node:22-alpine
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

EXPOSE 11435

ENV ABHYAS_PORT=11435
ENV OLLAMA_URL=http://host.docker.internal:11434

CMD ["npm", "run", "dev"]
