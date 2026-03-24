FROM node:20-alpine
WORKDIR /app
COPY package.json yarn.lock ./
COPY apps/chat-service/package.json ./apps/chat-service/
COPY libs/common/package.json ./libs/common/
COPY libs/prisma/package.json ./libs/prisma/
COPY libs/rabbitmq/package.json ./libs/rabbitmq/
RUN yarn install --frozen-lockfile
COPY . .
CMD ["yarn", "workspace", "chat-service", "start:dev"]
