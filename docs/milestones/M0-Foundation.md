# M0: Foundation & Shared Libraries

## Goal

Set up the foundational infrastructure that all services will depend on. By the end of this milestone, you'll have:

- Properly configured shared libraries (`@libs/common`, `@libs/prisma`, `@libs/rabbitmq`)
- A working Docker environment with PostgreSQL and RabbitMQ
- Database initialization scripts for all three databases
- Shared types and utilities that services will import

## Concepts You'll Learn

### 1. Monorepo with Yarn Workspaces

Your project uses **Yarn Workspaces** to manage multiple packages in one repository. Each `apps/*` and `libs/*` folder is a separate package that can depend on others.

```json
// Root package.json
{
  "workspaces": ["apps/*", "libs/*"]
}
```

**Why?** Code sharing without publishing to npm. The `@libs/*` packages are available to all services via TypeScript path aliases.

### 2. TypeScript Path Aliases

Instead of relative imports like `../../../libs/prisma`, you use clean aliases:

```typescript
import { PrismaService } from '@libs/prisma';
import { RabbitmqService } from '@libs/rabbitmq';
import { JwtPayload } from '@libs/common';
```

This is configured in `tsconfig.base.json` and each service extends it.

### 3. NestJS Dynamic Modules

The RabbitMQ library uses the **Dynamic Module** pattern, allowing each service to configure it differently:

```typescript
// In auth-service
RabbitmqModule.register({
  name: 'AUTH_SERVICE',
  queue: 'auth_queue',
})

// In tenant-service
RabbitmqModule.register({
  name: 'TENANT_SERVICE', 
  queue: 'tenant_queue',
})
```

### 4. Database-per-Service

Each service has its own database. This ensures:
- **Isolation**: One service can't accidentally query another's data
- **Independence**: Services can evolve their schemas independently
- **Scalability**: Databases can be scaled separately

---

## Implementation

### Step 1: Update the Database Init Script

Create proper initialization for all three databases.

**File: `scripts/init-db.sql`**

```sql
-- Create databases for each service
-- PostgreSQL executes this on first container startup

CREATE DATABASE auth_db;
CREATE DATABASE tenant_db;
CREATE DATABASE chat_db;

-- Note: Tables are managed by Prisma migrations in each service
-- This script only creates the empty databases
```

### Step 2: Update Docker Compose

Ensure proper health checks and environment variables.

**File: `docker-compose.yml`**

```yaml
services:
  postgres:
    image: postgres:16-alpine
    container_name: saas-postgres
    environment:
      POSTGRES_USER: saas
      POSTGRES_PASSWORD: saas_secret
      POSTGRES_DB: postgres
    ports:
      - "5433:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./scripts/init-db.sql:/docker-entrypoint-initdb.d/init-db.sql
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U saas"]
      interval: 5s
      timeout: 5s
      retries: 5

  rabbitmq:
    image: rabbitmq:3.13-management-alpine
    container_name: saas-rabbitmq
    environment:
      RABBITMQ_DEFAULT_USER: saas
      RABBITMQ_DEFAULT_PASS: saas_secret
    ports:
      - "5672:5672"   # AMQP
      - "15672:15672" # Management UI
    volumes:
      - rabbitmq_data:/var/lib/rabbitmq
    healthcheck:
      test: ["CMD", "rabbitmq-diagnostics", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

volumes:
  postgres_data:
  rabbitmq_data:
```

### Step 3: Shared Types Library (`@libs/common`)

This library holds types shared across services. Start with authentication-related types.

**File: `libs/common/src/index.ts`**

```typescript
// Re-export everything from the library
export * from './types';
export * from './constants';
```

**File: `libs/common/src/types/index.ts`**

```typescript
export * from './jwt-payload.interface';
export * from './events.interface';
```

**File: `libs/common/src/types/jwt-payload.interface.ts`**

```typescript
/**
 * JWT Access Token Payload
 * This is what gets encoded in the JWT and decoded by services
 */
export interface JwtPayload {
  /** User's unique identifier (subject) */
  sub: string;
  
  /** User's email address */
  email: string;
  
  /** Current tenant/workspace ID (null if not in a tenant context) */
  tenantId: string | null;
  
  /** User's role within the current tenant */
  role: 'owner' | 'admin' | 'member' | null;
  
  /** Token issued at timestamp */
  iat?: number;
  
  /** Token expiration timestamp */
  exp?: number;
}

/**
 * Refresh Token Payload
 * Minimal payload - only needs to identify the user
 */
export interface RefreshTokenPayload {
  /** User's unique identifier */
  sub: string;
  
  /** Token family ID for rotation tracking */
  family: string;
  
  iat?: number;
  exp?: number;
}
```

**File: `libs/common/src/types/events.interface.ts`**

```typescript
/**
 * Event names used across services
 * Keeping them as constants prevents typos
 */
export const Events = {
  USER_REGISTERED: 'user.registered',
  USER_DELETED: 'user.deleted',
  MESSAGE_SENT: 'message.sent',
  MEMBER_INVITED: 'member.invited',
} as const;

/**
 * Payload for user.registered event
 * Fired by auth-service, consumed by tenant-service
 */
export interface UserRegisteredEvent {
  userId: string;
  email: string;
  name: string;
  timestamp: Date;
}

/**
 * Payload for message.sent event
 * Fired by chat-service, consumed by notification-service (future)
 */
export interface MessageSentEvent {
  messageId: string;
  channelId: string;
  senderId: string;
  tenantId: string;
  content: string;
  timestamp: Date;
}
```

**File: `libs/common/src/constants/index.ts`**

```typescript
/**
 * RabbitMQ queue names
 */
export const Queues = {
  AUTH: 'auth_queue',
  TENANT: 'tenant_queue',
  CHAT: 'chat_queue',
} as const;

/**
 * JWT configuration constants
 */
export const JwtConfig = {
  ACCESS_TOKEN_EXPIRY: '15m',
  REFRESH_TOKEN_EXPIRY: '7d',
} as const;
```

**File: `libs/common/package.json`**

```json
{
  "name": "@libs/common",
  "version": "1.0.0",
  "main": "src/index.ts",
  "types": "src/index.ts"
}
```

### Step 4: Prisma Library (`@libs/prisma`)

A shared Prisma module that each service imports. Note: Each service has its **own** Prisma schema and migrations - this library just provides the NestJS wrapper.

**File: `libs/prisma/src/index.ts`**

```typescript
export * from './prisma.module';
export * from './prisma.service';
```

**File: `libs/prisma/src/prisma.service.ts`**

```typescript
import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    super({
      log: [
        { emit: 'event', level: 'query' },
        { emit: 'stdout', level: 'info' },
        { emit: 'stdout', level: 'warn' },
        { emit: 'stdout', level: 'error' },
      ],
    });
  }

  async onModuleInit() {
    await this.$connect();
    this.logger.log('Prisma connected to database');
  }

  async onModuleDestroy() {
    await this.$disconnect();
    this.logger.log('Prisma disconnected from database');
  }
}
```

**File: `libs/prisma/src/prisma.module.ts`**

```typescript
import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Global() // Makes PrismaService available everywhere without importing
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
```

**File: `libs/prisma/package.json`**

```json
{
  "name": "@libs/prisma",
  "version": "1.0.0",
  "main": "src/index.ts",
  "types": "src/index.ts",
  "dependencies": {
    "@prisma/client": "^6.5.0"
  },
  "devDependencies": {
    "prisma": "^6.5.0"
  }
}
```

### Step 5: RabbitMQ Library (`@libs/rabbitmq`)

A dynamic module for RabbitMQ integration with proper connection handling.

**File: `libs/rabbitmq/src/index.ts`**

```typescript
export * from './rabbitmq.module';
export * from './rabbitmq.service';
```

**File: `libs/rabbitmq/src/rabbitmq.module.ts`**

```typescript
import { DynamicModule, Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { RabbitmqService } from './rabbitmq.service';

export interface RabbitmqModuleOptions {
  /** Injection token name for the client */
  name: string;
  /** Queue name for this service */
  queue: string;
  /** RabbitMQ URL (defaults to env or localhost) */
  url?: string;
}

@Module({})
export class RabbitmqModule {
  /**
   * Register RabbitMQ client for a service
   * 
   * @example
   * RabbitmqModule.register({
   *   name: 'AUTH_SERVICE',
   *   queue: 'auth_queue',
   * })
   */
  static register(options: RabbitmqModuleOptions): DynamicModule {
    const url = options.url || process.env.RABBITMQ_URL || 'amqp://saas:saas_secret@localhost:5672';
    
    return {
      module: RabbitmqModule,
      imports: [
        ClientsModule.register([
          {
            name: options.name,
            transport: Transport.RMQ,
            options: {
              urls: [url],
              queue: options.queue,
              queueOptions: {
                durable: true, // Queue survives broker restart
              },
              noAck: false, // Manual acknowledgment required
            },
          },
        ]),
      ],
      providers: [RabbitmqService],
      exports: [ClientsModule, RabbitmqService],
    };
  }

  /**
   * Register as a microservice (consumer)
   * Use this when the service needs to LISTEN for events
   */
  static registerAsync(options: RabbitmqModuleOptions): DynamicModule {
    return this.register(options);
  }
}
```

**File: `libs/rabbitmq/src/rabbitmq.service.ts`**

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { RmqContext } from '@nestjs/microservices';

@Injectable()
export class RabbitmqService {
  private readonly logger = new Logger(RabbitmqService.name);

  /**
   * Acknowledge a message (mark as processed)
   * Call this after successfully handling an event
   */
  ack(context: RmqContext): void {
    const channel = context.getChannelRef();
    const originalMessage = context.getMessage();
    channel.ack(originalMessage);
    this.logger.debug('Message acknowledged');
  }

  /**
   * Negative acknowledge (reject and optionally requeue)
   * Call this when processing fails
   * 
   * @param requeue - If true, message goes back to queue for retry
   */
  nack(context: RmqContext, requeue = false): void {
    const channel = context.getChannelRef();
    const originalMessage = context.getMessage();
    channel.nack(originalMessage, false, requeue);
    this.logger.debug(`Message nacked (requeue: ${requeue})`);
  }
}
```

**File: `libs/rabbitmq/package.json`**

```json
{
  "name": "@libs/rabbitmq",
  "version": "1.0.0",
  "main": "src/index.ts",
  "types": "src/index.ts",
  "dependencies": {
    "@nestjs/microservices": "^11.0.0",
    "amqplib": "^0.10.5"
  }
}
```

### Step 6: Base TypeScript Configuration

**File: `tsconfig.base.json`**

```json
{
  "compilerOptions": {
    "module": "commonjs",
    "target": "ES2021",
    "lib": ["ES2021"],
    "declaration": true,
    "removeComments": true,
    "emitDecoratorMetadata": true,
    "experimentalDecorators": true,
    "allowSyntheticDefaultImports": true,
    "esModuleInterop": true,
    "strict": true,
    "strictNullChecks": true,
    "noImplicitAny": true,
    "strictBindCallApply": true,
    "forceConsistentCasingInFileNames": true,
    "noFallthroughCasesInSwitch": true,
    "skipLibCheck": true,
    "incremental": true,
    "baseUrl": ".",
    "paths": {
      "@libs/prisma": ["libs/prisma/src/index.ts"],
      "@libs/prisma/*": ["libs/prisma/src/*"],
      "@libs/rabbitmq": ["libs/rabbitmq/src/index.ts"],
      "@libs/rabbitmq/*": ["libs/rabbitmq/src/*"],
      "@libs/common": ["libs/common/src/index.ts"],
      "@libs/common/*": ["libs/common/src/*"]
    }
  }
}
```

---

## Directory Structure After M0

```
saas-app/
├── apps/
│   ├── auth-service/
│   ├── tenant-service/
│   └── chat-service/
├── libs/
│   ├── common/
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   ├── types/
│   │   │   │   ├── index.ts
│   │   │   │   ├── jwt-payload.interface.ts
│   │   │   │   └── events.interface.ts
│   │   │   └── constants/
│   │   │       └── index.ts
│   │   └── package.json
│   ├── prisma/
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   ├── prisma.module.ts
│   │   │   └── prisma.service.ts
│   │   └── package.json
│   └── rabbitmq/
│       ├── src/
│       │   ├── index.ts
│       │   ├── rabbitmq.module.ts
│       │   └── rabbitmq.service.ts
│       └── package.json
├── scripts/
│   └── init-db.sql
├── docker-compose.yml
├── tsconfig.base.json
├── package.json
└── yarn.lock
```

---

## Testing Your Implementation

### 1. Start Infrastructure

```bash
# Start PostgreSQL and RabbitMQ
yarn docker:up

# Verify containers are healthy
docker ps

# Check RabbitMQ UI
# Open http://localhost:15672 (login: saas / saas_secret)
```

### 2. Verify Databases

```bash
# Connect to PostgreSQL and list databases
docker exec -it saas-postgres psql -U saas -c "\l"

# You should see:
#  auth_db
#  tenant_db
#  chat_db
```

### 3. Install Dependencies

```bash
# From project root
yarn install
```

### 4. Verify TypeScript Paths

Create a quick test in any service:

```typescript
// In apps/auth-service/src/test-imports.ts (temporary)
import { JwtPayload, Events, Queues } from '@libs/common';
import { PrismaModule } from '@libs/prisma';
import { RabbitmqModule } from '@libs/rabbitmq';

console.log('Imports work!', Events.USER_REGISTERED);
```

Run: `npx ts-node apps/auth-service/src/test-imports.ts`

---

## Key Takeaways

1. **Monorepo Benefits**: Shared code without npm publishing, atomic commits across services
2. **Path Aliases**: Clean imports with `@libs/*` instead of relative paths
3. **Dynamic Modules**: Configure the same module differently per service
4. **Database Isolation**: Each service owns its data completely
5. **Health Checks**: Docker ensures services start in the right order

---

## What's Next?

In **M1: Auth Service - Core**, you'll implement:
- User model with Prisma
- Registration endpoint
- Password hashing with bcrypt
- JWT access & refresh token generation

→ Continue to [M1-Auth-Core.md](./M1-Auth-Core.md)
