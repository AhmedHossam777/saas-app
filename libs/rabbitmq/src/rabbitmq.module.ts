import { DynamicModule, Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { RabbitmqService } from './rabbitmq.service';

export interface RabbitmqModuleOptions {
  name: string;
  queue: string;
  url?: string;
}

@Module({})
export class RabbitmqModule {
  static register(options: RabbitmqModuleOptions): DynamicModule {
    return {
      module: RabbitmqModule,
      imports: [
        ClientsModule.register([
          {
            name: options.name,
            transport: Transport.RMQ,
            options: {
              urls: [options.url ?? 'amqp://saas:saas_secret@rabbitmq:5672'],
              queue: options.queue,
              queueOptions: { durable: true },
              noAck: true,
            },
          },
        ]),
      ],
      providers: [RabbitmqService],
      exports: [ClientsModule, RabbitmqService],
    };
  }

  static registerAsync(options: RabbitmqModuleOptions): DynamicModule {
    return this.register(options);
  }
}
