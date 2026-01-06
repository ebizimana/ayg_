import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthUser } from '../../common/decorators/current-user.decorator';
import { CoursesService } from './courses.service';
import { CreateCourseDto } from './dto/create-course.dto';
import { UpdateCourseDto } from './dto/update-course.dto';
import { GradePlanQueryDto } from './dto/grade-plan.dto';

@UseGuards(JwtAuthGuard)
@Controller()
export class CoursesController {
  constructor(private coursesService: CoursesService) {}

  // Nested under semester
  @Post('semesters/:semesterId/courses')
  create(
    @CurrentUser() user: AuthUser,
    @Param('semesterId') semesterId: string,
    @Body() dto: CreateCourseDto,
  ) {
    return this.coursesService.create(user.userId, semesterId, dto);
  }

  @Get('semesters/:semesterId/courses')
  findAllForSemester(
    @CurrentUser() user: AuthUser,
    @Param('semesterId') semesterId: string,
  ) {
    return this.coursesService.findAllForSemester(user.userId, semesterId);
  }

  // Flat endpoints by course id
  @Get('courses/:id')
  findOne(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.coursesService.findOne(user.userId, id);
  }

  @Get('courses/:id/grade-plan')
  gradePlan(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Query() query: GradePlanQueryDto,
  ) {
    return this.coursesService.gradePlan(user.userId, id, query);
  }

  @Patch('courses/:id')
  update(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: UpdateCourseDto) {
    return this.coursesService.update(user.userId, id, dto);
  }

  @Delete('courses/:id')
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.coursesService.remove(user.userId, id);
  }
}
