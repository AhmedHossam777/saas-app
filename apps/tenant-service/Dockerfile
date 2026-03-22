FROM node:20-alpine
WORKDIR /app
COPY package.json yarn.lock ./
COPY apps/tenant-service/package.json ./apps/tenant-service/
COPY libs/ ./libs/
RUN yarn install --frozen-lockfile
COPY . .
CMD ["yarn", "workspace", "tenant-service", "start:dev"]