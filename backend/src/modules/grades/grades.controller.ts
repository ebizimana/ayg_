import { Body, Controller, Delete, Get, Param, Patch, Post, Put, UseGuards } from '@nestjs/common';
import { GradesService } from './grades.service';
import { CreateGradeDto } from './dto/create-grade.dto';
import { UpdateGradeDto } from './dto/update-grade.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthUser } from '../../common/decorators/current-user.decorator';

@UseGuards(JwtAuthGuard)
@Controller()
export class GradesController {
  constructor(private readonly grades: GradesService) {}

  @Post('assignments/:assignmentId/grade')
  create(@Param('assignmentId') assignmentId: string, @Body() dto: CreateGradeDto, @CurrentUser() user: AuthUser) {
    return this.grades.create(assignmentId, user.userId, dto);
  }

  @Get('assignments/:assignmentId/grade')
  get(@Param('assignmentId') assignmentId: string, @CurrentUser() user: AuthUser) {
    return this.grades.getByAssignment(assignmentId, user.userId);
  }

  @Patch('assignments/:assignmentId/grade')
  update(@Param('assignmentId') assignmentId: string, @Body() dto: UpdateGradeDto, @CurrentUser() user: AuthUser) {
    return this.grades.updateByAssignment(assignmentId, user.userId, dto);
  }

  @Delete('assignments/:assignmentId/grade')
  remove(@Param('assignmentId') assignmentId: string, @CurrentUser() user: AuthUser) {
    return this.grades.removeByAssignment(assignmentId, user.userId);
  }

  // Recommended endpoint: set prediction or actual score any time
  @Put('assignments/:assignmentId/grade')
  upsert(@Param('assignmentId') assignmentId: string, @Body() dto: UpdateGradeDto, @CurrentUser() user: AuthUser) {
    return this.grades.upsertByAssignment(assignmentId, user.userId, dto);
  }
}
