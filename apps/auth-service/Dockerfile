FROM node:20-alpine
WORKDIR /app
COPY package.json yarn.lock ./
COPY apps/auth-service/package.json ./apps/auth-service/
COPY libs/ ./libs/
RUN yarn install --frozen-lockfile
COPY . .
CMD ["yarn", "workspace", "auth-service", "start:dev"]