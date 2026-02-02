import { Controller, Get, UseGuards } from '@nestjs/common';
import { AppService } from './app.service';
import { UserAuthGuard } from './common/guards/user-auth.guard';

@Controller()
@UseGuards(UserAuthGuard)
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }
}
