import { Module } from '@nestjs/common';
import { CoursesService } from './courses.service';
import { CoursesController } from './courses.controller';
import { TargetGpaModule } from '../target-gpa/target-gpa.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [TargetGpaModule, UsersModule],
  providers: [CoursesService],
  controllers: [CoursesController],
})
export class CoursesModule {}
