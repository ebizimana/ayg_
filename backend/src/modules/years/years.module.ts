import { Module } from '@nestjs/common';
import { YearsService } from './years.service';
import { YearsController } from './years.controller';

@Module({
  providers: [YearsService],
  controllers: [YearsController],
})
export class YearsModule {}
