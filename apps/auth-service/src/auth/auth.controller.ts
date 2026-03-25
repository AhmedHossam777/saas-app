import { Body, Controller, Get, Logger, Post } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto, RegisterDto } from './dto';
import { RefreshDto } from './dto/refresh.dto';

@Controller()
export class AuthController {
  private readonly logger = new Logger(AuthController.name);
  constructor(private readonly appService: AuthService) {}

  @Post('login')
  async login(@Body() loginDto: LoginDto) {
    this.logger.log(`Login attempt for user: ${loginDto.email}`);
    return this.appService.login(loginDto);
  }

  @Post('register')
  async register(@Body() registerDto: RegisterDto) {
    this.logger.log(`Registration attempt for user: ${registerDto.email}`);
    return this.appService.register(registerDto);
  }

  @Post('refresh')
  async refresh(@Body() refreshDto: RefreshDto) {
    this.logger.log(
      `Token refresh attempt with token: ${refreshDto.refreshToken}`,
    );
    return this.appService.refresh(refreshDto.refreshToken);
  }

  @Post('logout')
  async logout(@Body() logoutDto: RefreshDto) {
    this.logger.log(`Logout attempt with token: ${logoutDto.refreshToken}`);
    return this.appService.logout(logoutDto.refreshToken);
  }

  @Get('health')
  healthCheck() {
    this.logger.log('Health check endpoint called');
    return { status: 'ok' };
  }
}
