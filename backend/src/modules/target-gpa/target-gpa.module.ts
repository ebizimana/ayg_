import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { TargetGpaController } from './target-gpa.controller';
import { TargetGpaService } from './target-gpa.service';

@Module({
  imports: [PrismaModule],
  controllers: [TargetGpaController],
  providers: [TargetGpaService],
  exports: [TargetGpaService],
})
export class TargetGpaModule {}
