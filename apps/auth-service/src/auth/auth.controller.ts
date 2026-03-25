import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Logger,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto, RegisterDto, RefreshDto } from './dto';
import { JwtAuthGuard } from './guards';
import { JwtPayload } from 'jsonwebtoken';
import { CurrentUser } from './decorators';

@Controller()
export class AuthController {
  private readonly logger = new Logger(AuthController.name);
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() loginDto: LoginDto) {
    this.logger.log(`Login attempt for user: ${loginDto.email}`);
    return this.authService.login(loginDto);
  }

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(@Body() registerDto: RegisterDto) {
    this.logger.log(`Registration attempt for user: ${registerDto.email}`);
    return this.authService.register(registerDto);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@Body() refreshDto: RefreshDto) {
    this.logger.log(
      `Token refresh attempt with token: ${refreshDto.refreshToken}`,
    );
    return this.authService.refresh(refreshDto);
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(@Body() logoutDto: RefreshDto) {
    this.logger.log(`Logout attempt with token: ${logoutDto.refreshToken}`);
    return this.authService.logout(logoutDto);
  }

  @Post('logout-all')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async logoutAll(@Body() { userId }: { userId: string }) {
    this.logger.log(`Logout all attempt for user: ${userId}`);
    return this.authService.logoutAll(userId);
  }

  @Get('health')
  @HttpCode(HttpStatus.OK)
  healthCheck() {
    this.logger.log('Health check endpoint called');
    return { status: 'ok' };
  }

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  async getProfile(@CurrentUser() user: JwtPayload) {
    return this.authService.getProfile(user.sub);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async me(@CurrentUser() user: JwtPayload) {
    return {
      id: user.sub,
      email: user.email,
      tenantId: user.tenantId,
      role: user.role,
    };
  }
}
