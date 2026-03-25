import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConditionalModule, ConfigModule } from '@nestjs/config';
import { PrismaModule } from '@libs/prisma';
import { TokenProvider } from './providers/token.provider';
import { JwtModule } from '@nestjs/jwt';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
    JwtModule.register({}),
    ConditionalModule,
  ],
  controllers: [AppController],
  providers: [AppService, TokenProvider],
})
export class AppModule {}
