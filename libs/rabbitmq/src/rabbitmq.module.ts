import { DynamicModule, Module } from '@nestjs/common';
import {
  ClientsModule,
  Transport,
  RmqOptions,
} from '@nestjs/microservices';
import { RabbitmqService } from './rabbitmq.service';

export interface RabbitmqModuleOptions {
  name: string;
  queue: string;
}

@Module({})
export class RabbitmqModule {
  static register(options: RabbitmqModuleOptions): DynamicModule {
    return {
      module: RabbitmqModule,
      imports: [
        ClientsModule.registerAsync([
          {
            name: options.name,
            useFactory: () => ({
              transport: Transport.RMQ,
              options: {
                urls: [process.env.RABBITMQ_URL ?? 'amqp://saas:saas_secret@rabbitmq:5672'],
                queue: options.queue,
                queueOptions: { durable: true },
              },
            } as RmqOptions),
          },
        ]),
      ],
      providers: [RabbitmqService],
      exports: [ClientsModule, RabbitmqService],
    };
  }
}