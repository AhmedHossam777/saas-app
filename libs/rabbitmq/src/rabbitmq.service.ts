import { Injectable } from '@nestjs/common';
import { RmqContext } from '@nestjs/microservices';

@Injectable()
export class RabbitmqService {
  ack(context: RmqContext) {
    const channel = context.getChannelRef();
    const message = context.getMessage();
    channel.ack(message);
  }

  nack(context: RmqContext, requeue = false) {
    const channel = context.getChannelRef();
    const message = context.getMessage();
    channel.nack(message, false, requeue);
  }
}