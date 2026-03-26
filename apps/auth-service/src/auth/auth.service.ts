import {
  ConflictException,
  Inject,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { TokenProvider } from './providers/token.provider';
import { LoginDto, RegisterDto, RefreshDto } from './dto';
import { PrismaService } from '@libs/prisma';
import { AuthResponse } from './types/auth.interface';
import * as bcrypt from 'bcrypt';
import { ClientProxy } from '@nestjs/microservices';
import { RabbitMQEvents, UserRegisteredEvent } from '@libs/common';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  constructor(
    private readonly tokenProvider: TokenProvider,
    private readonly prismaService: PrismaService,
    @Inject('RABBITMQ_CLIENT') private readonly rmqClient: ClientProxy,
  ) {}

  async register(registerDto: RegisterDto): Promise<AuthResponse> {
    this.logger.log(`Registering user with email: ${registerDto.email}`);

    const existing = await this.prismaService.user.findUnique({
      where: { email: registerDto.email },
    });
    if (existing) {
      throw new ConflictException('Email already in use');
    }

    const hashedPassword = await bcrypt.hash(registerDto.password, 12);
    const user = await this.prismaService.user.create({
      data: {
        email: registerDto.email,
        name: registerDto.name,
        password: hashedPassword,
      },
    });

    this.logger.log(`User registered: ${user.email} (ID: ${user.id})`);
    const event: UserRegisteredEvent = {
      userId: user.id,
      email: user.email,
      name: user.name,
      timestamp: new Date().toISOString(),
    };

    this.rmqClient.emit(RabbitMQEvents.USER_REGISTERED, event);
    this.logger.log(
      `Emitted event: ${RabbitMQEvents.USER_REGISTERED} for user ${user.email}`,
    );

    const tokens = await this.tokenProvider.generateTokens(user.id, user.email);
    return {
      ...tokens,
      user: { id: user.id, email: user.email, name: user.name },
    };
  }

  async login(loginDto: LoginDto): Promise<AuthResponse> {
    this.logger.log(`Login attempt for: ${loginDto.email}`);

    const user = await this.prismaService.user.findUnique({
      where: { email: loginDto.email },
    });
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const passwordValid = await bcrypt.compare(
      loginDto.password,
      user.password,
    );
    if (!passwordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const tokens = await this.tokenProvider.generateTokens(user.id, user.email);
    return {
      ...tokens,
      user: { id: user.id, email: user.email, name: user.name },
    };
  }

  async refresh(refreshToken: RefreshDto): Promise<AuthResponse> {
    let payload: Awaited<ReturnType<TokenProvider['verifyRefreshToken']>>;
    try {
      payload = await this.tokenProvider.verifyRefreshToken(
        refreshToken.refreshToken,
      );
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const tokenRecords = await this.prismaService.refreshToken.findMany({
      where: { family: payload.family },
    });
    if (!tokenRecords.length) {
      throw new UnauthorizedException('Refresh token not found');
    }

    const matchedRecord = await Promise.all(
      tokenRecords.map(async (record: (typeof tokenRecords)[number]) => {
        const match = await bcrypt.compare(
          refreshToken.refreshToken,
          record.token,
        );
        return match ? record : null;
      }),
    ).then((results) => results.find(Boolean));

    if (!matchedRecord) {
      // Token reuse detected — invalidate the entire family
      await this.tokenProvider.revokeTokenFamily(payload.family);
      this.logger.warn(`Token reuse detected for family ${payload.family}`);
      throw new UnauthorizedException('Token reuse detected');
    }

    if (matchedRecord.expiresAt < new Date()) {
      await this.tokenProvider.revokeTokenFamily(payload.family);
      throw new UnauthorizedException('Refresh token expired');
    }

    await this.prismaService.refreshToken.update({
      where: { id: matchedRecord.id },
      data: { revokedAt: new Date() },
    });

    const user = await this.prismaService.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, email: true, name: true },
    });
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const tokens = await this.tokenProvider.generateTokensWithFamily(
      user.id,
      user.email,
      payload.family,
    );
    return { ...tokens, user };
  }

  async logout(refreshToken: RefreshDto): Promise<void> {
    try {
      const payload = await this.tokenProvider.verifyRefreshToken(
        refreshToken.refreshToken,
      );
      await this.tokenProvider.revokeTokenFamily(payload.family);
      this.logger.log(`User ${payload.sub} logged out`);
    } catch {
      // If token is invalid, nothing to invalidate
    }
  }

  async logoutAll(userId: string): Promise<void> {
    await this.prismaService.refreshToken.updateMany({
      where: {
        userId,
        revokedAt: null,
      },
      data: {
        revokedAt: new Date(),
      },
    });

    this.logger.log(`User ${userId} logged out from all devices`);
  }

  async findById(id: string) {
    return this.prismaService.user.findUnique({
      where: { id },
      select: { id: true, email: true, name: true },
    });
  }

  async getProfile(userId: string) {
    const user = await this.prismaService.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return user;
  }
}
