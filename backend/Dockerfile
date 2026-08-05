# Backend Dockerfile
FROM node:22-alpine
WORKDIR /app

ENV NODE_ENV=development
COPY package.json package-lock.json ./
RUN NODE_ENV=development npm ci

COPY . .

EXPOSE 4000
ENV PORT=4000

CMD ["npm", "run", "dev"]
