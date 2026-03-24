# SaaS Microservice Learning Path

## Overview

You're building a **multi-tenant SaaS platform** with real-time chat capabilities. This guide breaks the project into 7 milestones (M0–M6), each building on the previous.

## Architecture At a Glance

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Client    │────▶│ API Gateway │────▶│   Services  │
│  (Browser)  │     │  (Future)   │     │             │
└─────────────┘     └─────────────┘     └──────┬──────┘
                                               │
                    ┌──────────────────────────┼──────────────────────────┐
                    │                          │                          │
              ┌─────▼─────┐            ┌───────▼───────┐          ┌───────▼───────┐
              │   Auth    │            │    Tenant     │          │     Chat      │
              │  Service  │            │    Service    │          │    Service    │
              │  :3001    │            │    :3002      │          │    :3003      │
              └─────┬─────┘            └───────┬───────┘          └───────┬───────┘
                    │                          │                          │
              ┌─────▼─────┐            ┌───────▼───────┐          ┌───────▼───────┐
              │  auth_db  │            │   tenant_db   │          │    chat_db    │
              └───────────┘            └───────────────┘          └───────────────┘
                    │                          │                          │
                    └──────────────────────────┼──────────────────────────┘
                                               │
                                        ┌──────▼──────┐
                                        │  RabbitMQ   │
                                        │   Events    │
                                        └─────────────┘
```

## The User Journey

```
Register → Get Tokens → Auto-create Workspace → Create Org → Invite Users → Join Channel → Chat in Real-time
    │           │              │                    │            │              │              │
    └───────────┴──────────────┴────────────────────┴────────────┴──────────────┴──────────────┘
                                    Events flow through RabbitMQ
```

## Milestones

| Milestone | Name | What You'll Learn |
|-----------|------|-------------------|
| **M0** | Foundation & Shared Libraries | Monorepo setup, Prisma patterns, RabbitMQ helpers, shared types |
| **M1** | Auth Service - Core | User registration, password hashing, JWT access/refresh tokens |
| **M2** | Auth Service - Advanced | Token rotation, refresh flow, logout/revocation, guards |
| **M3** | Tenant Service - Core | Event consumption, auto workspace creation, tenant isolation |
| **M4** | Tenant Service - Advanced | Organizations, invitations, roles (owner/admin/member), RBAC |
| **M5** | Chat Service - Core | WebSocket setup, JWT auth over sockets, channels, message persistence |
| **M6** | Chat Service - Events | Publishing `message.sent` events, reconnection handling, presence |

## How to Use This Guide

1. **Read the milestone doc** - Understand the concepts and see the implementation
2. **Try it yourself** - Implement without looking at the solution
3. **Compare** - Check your implementation against the guide
4. **Test** - Make sure everything works before moving on
5. **Ask questions** - Come back if you get stuck

## Key Concepts You'll Master

- **Event-Driven Architecture** - Services communicate via RabbitMQ events
- **Database-per-Service** - True data isolation between services
- **JWT Authentication** - Access/refresh token pattern with rotation
- **Multi-Tenancy** - Row-level security via Prisma middleware
- **Real-time Communication** - Socket.io with JWT authentication
- **NestJS Patterns** - Guards, interceptors, decorators, modules

## Prerequisites

Before starting, make sure you understand:
- TypeScript basics
- NestJS fundamentals (modules, controllers, services, providers)
- Basic SQL / Prisma concepts
- Docker basics

## Current Project State

Your project already has the skeleton:
```
saas-app/
├── apps/
│   ├── auth-service/    # Scaffold only
│   ├── tenant-service/  # Scaffold only
│   └── chat-service/    # Scaffold only
├── libs/
│   ├── common/          # JwtPayload interface
│   ├── prisma/          # PrismaModule (basic)
│   └── rabbitmq/        # RabbitmqModule (basic)
├── docker-compose.yml
└── package.json
```

Let's build it out properly! Start with **M0-Foundation.md** →
