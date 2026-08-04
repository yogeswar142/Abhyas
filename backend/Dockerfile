# Backend Dockerfile
FROM node:22-alpine
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

EXPOSE 4000

ENV PORT=4000
ENV NODE_ENV=development

CMD ["npm", "run", "dev"]
