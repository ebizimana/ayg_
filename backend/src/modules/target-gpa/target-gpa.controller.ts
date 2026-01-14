import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthUser } from '../../common/decorators/current-user.decorator';
import { TargetGpaService } from './target-gpa.service';
import { EnableTargetGpaDto } from './dto/enable-target-gpa.dto';
import { DisableTargetGpaDto } from './dto/disable-target-gpa.dto';

@UseGuards(JwtAuthGuard)
@Controller('target-gpa')
export class TargetGpaController {
  constructor(private targetGpaService: TargetGpaService) {}

  @Get('active')
  getActive(@CurrentUser() user: AuthUser) {
    return this.targetGpaService.getActiveSession(user.userId);
  }

  @Post('enable')
  enable(@CurrentUser() user: AuthUser, @Body() dto: EnableTargetGpaDto) {
    return this.targetGpaService.enable(user.userId, dto);
  }

  @Post('disable')
  disable(@CurrentUser() user: AuthUser, @Body() dto: DisableTargetGpaDto) {
    return this.targetGpaService.disable(user.userId, dto);
  }
}
