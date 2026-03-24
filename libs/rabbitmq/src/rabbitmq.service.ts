import { Injectable, Logger } from '@nestjs/common';
import { RmqContext } from '@nestjs/microservices';

@Injectable()
export class RabbitmqService {
  private readonly logger = new Logger(RabbitmqService.name)
  ack(context: RmqContext) {
    const channel = context.getChannelRef();
    const message = context.getMessage();
    channel.ack(message);
    this.logger.debug('Message acked');
  }

  nack(context: RmqContext, requeue = false) {
    const channel = context.getChannelRef();
    const message = context.getMessage();
    channel.nack(message, false, requeue);
    this.logger.debug('Message nacked');
  }
}