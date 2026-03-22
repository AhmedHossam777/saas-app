FROM node:20-alpine
WORKDIR /app
COPY package.json yarn.lock ./
COPY apps/chat-service/package.json ./apps/chat-service/
COPY libs/ ./libs/
RUN yarn install --frozen-lockfile
COPY . .
CMD ["yarn", "workspace", "chat-service", "start:dev"]