import { Module } from '@nestjs/common';
import { SemestersService } from './semesters.service';
import { SemestersController } from './semesters.controller';
import { TargetGpaModule } from '../target-gpa/target-gpa.module';

@Module({
  imports: [TargetGpaModule],
  providers: [SemestersService],
  controllers: [SemestersController],
})
export class SemestersModule {}
