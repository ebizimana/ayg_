import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { HealthController } from './health.controller';
import { SemestersModule } from './modules/semesters/semesters.module';

@Module({
  imports: [PrismaModule, UsersModule, AuthModule, SemestersModule],
  controllers: [HealthController],
})
export class AppModule {}
