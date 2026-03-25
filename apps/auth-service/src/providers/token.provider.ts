import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { JwtPayload, RefreshTokenPayload } from '@libs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@libs/prisma';
import { JwtService } from '@nestjs/jwt';
import type { StringValue } from 'ms';
import * as bcrypt from 'bcrypt';
import { AuthTokens } from '../types/auth.interface';

@Injectable()
export class TokenProvider {
  private readonly logger = new Logger(TokenProvider.name);
  constructor(
    private readonly configService: ConfigService,
    private readonly prismaService: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async generateTokens(userId: string, email: string): Promise<AuthTokens> {
    const family = randomUUID();
    const accessTokenPayload: JwtPayload = {
      sub: userId,
      email,
      tenantId: null,
      role: null,
    };
    const refreshTokenPayload: RefreshTokenPayload = { sub: userId, family };
    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(accessTokenPayload, {
        secret: this.configService.get<string>('JWT_ACCESS_SECRET'),
        expiresIn: this.configService.get<StringValue>(
          'JWT_ACCESS_EXPIRY',
          '15m',
        ),
      }),
      this.jwtService.signAsync(refreshTokenPayload, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
        expiresIn: this.configService.get<StringValue>(
          'JWT_REFRESH_EXPIRY',
          '7d',
        ),
      }),
    ]);
    this.logger.log(`Generated tokens for user ${email} (ID: ${userId})`);

    const hashedRefreshToken = await bcrypt.hash(refreshToken, 12);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await this.prismaService.refreshToken.create({
      data: {
        token: hashedRefreshToken,
        family,
        userId,
        expiresAt,
      },
    });
    return { accessToken, refreshToken };
  }

  async verifyAccessToken(token: string): Promise<JwtPayload> {
    try {
      return await this.jwtService.verifyAsync(token, {
        secret: this.configService.get<string>('JWT_ACCESS_SECRET'),
      });
    } catch (error: any) {
      this.logger.warn(`Access token verification failed: ${error.message}`);
      throw error;
    }
  }

  async verifyRefreshToken(token: string): Promise<RefreshTokenPayload> {
    try {
      return await this.jwtService.verifyAsync(token, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      });
    } catch (error: any) {
      this.logger.warn(`Refresh token verification failed: ${error.message}`);
      throw error;
    }
  }

  async invalidateRefreshToken(family: string): Promise<void> {
    await this.prismaService.refreshToken.deleteMany({ where: { family } });
    this.logger.log(`Invalidated refresh tokens with family ${family}`);
  }
}
