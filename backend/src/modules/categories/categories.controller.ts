import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthUser } from '../../common/decorators/current-user.decorator';
import { CategoriesService } from './categories.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { UpdateCategoryOrderDto } from './dto/update-category-order.dto';

@UseGuards(JwtAuthGuard)
@Controller()
export class CategoriesController {
  constructor(private categoriesService: CategoriesService) {}

  // Nested under course
  @Post('courses/:courseId/categories')
  create(
    @CurrentUser() user: AuthUser,
    @Param('courseId') courseId: string,
    @Body() dto: CreateCategoryDto,
  ) {
    return this.categoriesService.create(user.userId, courseId, dto);
  }

  @Get('courses/:courseId/categories')
  findAllForCourse(@CurrentUser() user: AuthUser, @Param('courseId') courseId: string) {
    return this.categoriesService.findAllForCourse(user.userId, courseId);
  }

  // Flat endpoints by category id
  @Get('categories/:id')
  findOne(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.categoriesService.findOne(user.userId, id);
  }

  @Patch('categories/reorder')
  updateOrder(@CurrentUser() user: AuthUser, @Body() dto: UpdateCategoryOrderDto) {
    return this.categoriesService.updateOrder(user.userId, dto.orderedIds);
  }

  @Patch('categories/:id')
  update(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: UpdateCategoryDto) {
    return this.categoriesService.update(user.userId, id, dto);
  }

  @Delete('categories/:id')
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.categoriesService.remove(user.userId, id);
  }
}
