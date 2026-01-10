import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthUser } from '../../common/decorators/current-user.decorator';
import { SemestersService } from './semesters.service';
import { CreateSemesterDto } from './dto/create-semester.dto';
import { UpdateSemesterDto } from './dto/update-semester.dto';

@UseGuards(JwtAuthGuard)
@Controller('semesters')
export class SemestersController {
  constructor(private semestersService: SemestersService) {}

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateSemesterDto) {
    return this.semestersService.create(user.userId, dto);
  }

  @Get()
  findAll(@CurrentUser() user: AuthUser) {
    return this.semestersService.findAll(user.userId);
  }

  @Get(':id')
  findOne(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.semestersService.findOne(user.userId, id);
  }

  @Patch(':id')
  update(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: UpdateSemesterDto) {
    return this.semestersService.update(user.userId, id, dto);
  }

  @Delete(':id')
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.semestersService.remove(user.userId, id);
  }

  @Post(':id/run-simulations')
  runSimulations(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.semestersService.runSimulations(user.userId, id);
  }
}
