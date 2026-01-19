import { Module } from '@nestjs/common';
import { SemestersService } from './semesters.service';
import { SemestersController } from './semesters.controller';
import { TargetGpaModule } from '../target-gpa/target-gpa.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [TargetGpaModule, UsersModule],
  providers: [SemestersService],
  controllers: [SemestersController],
})
export class SemestersModule {}
