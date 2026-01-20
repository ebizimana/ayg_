import { Body, Controller, Delete, Get, Patch, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthUser } from '../../common/decorators/current-user.decorator';
import { UsersService } from './users.service';
import { UpdateTierDto } from './dto/update-tier.dto';
import { UpdateCurrentGpaDto } from './dto/update-current-gpa.dto';

@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get('me')
  async me(@CurrentUser() user: AuthUser) {
    return this.usersService.getProfile(user.userId);
  }

  @Patch('me/tier')
  async updateTier(@CurrentUser() user: AuthUser, @Body() dto: UpdateTierDto) {
    return this.usersService.updateTier(user.userId, dto.tier);
  }

  @Patch('me/current-gpa')
  async updateCurrentGpa(@CurrentUser() user: AuthUser, @Body() dto: UpdateCurrentGpaDto) {
    return this.usersService.updateCurrentGpa(user.userId, dto.currentGpa);
  }

  @Delete('me')
  async deleteAccount(@CurrentUser() user: AuthUser) {
    await this.usersService.deleteAccount(user.userId);
    return { success: true };
  }
}
