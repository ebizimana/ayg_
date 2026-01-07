import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards, ParseUUIDPipe } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthUser } from '../../common/decorators/current-user.decorator';
import { AssignmentsService } from './assignments.service';
import { CreateAssignmentDto } from './dto/create-assignment.dto';
import { UpdateAssignmentDto } from './dto/update-assignment.dto';
import { UpdateAssignmentOrderDto } from './dto/update-assignment-order.dto';

@UseGuards(JwtAuthGuard)
@Controller()
export class AssignmentsController {
  constructor(private assignmentsService: AssignmentsService) {}

  @Post('categories/:categoryId/assignments')
  create(
    @CurrentUser() user: AuthUser,
    @Param('categoryId') categoryId: string,
    @Body() dto: CreateAssignmentDto,
  ) {
    return this.assignmentsService.create(user.userId, categoryId, dto);
  }

  @Get('categories/:categoryId/assignments')
  findAllForCategory(@CurrentUser() user: AuthUser, @Param('categoryId') categoryId: string) {
    return this.assignmentsService.findAllForCategory(user.userId, categoryId);
  }

  @Get('assignments/:id')
  findOne(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.assignmentsService.findOne(user.userId, id);
  }

  @Patch('assignments/order')
  updateOrder(@CurrentUser() user: AuthUser, @Body() dto: UpdateAssignmentOrderDto) {
    return this.assignmentsService.updateOrder(user.userId, dto.orderedIds);
  }

  @Patch('assignments/reorder')
  updateOrderAlias(@CurrentUser() user: AuthUser, @Body() dto: UpdateAssignmentOrderDto) {
    return this.assignmentsService.updateOrder(user.userId, dto.orderedIds);
  }

  @Patch('assignments/:id')
  update(@CurrentUser() user: AuthUser, @Param('id', new ParseUUIDPipe()) id: string, @Body() dto: UpdateAssignmentDto) {
    return this.assignmentsService.update(user.userId, id, dto);
  }

  @Delete('assignments/:id')
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.assignmentsService.remove(user.userId, id);
  }
}
