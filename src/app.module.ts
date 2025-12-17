import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { HealthController } from './health.controller';
import { SemestersModule } from './modules/semesters/semesters.module';
import { CoursesModule } from './modules/courses/courses.module';

@Module({
  imports: [PrismaModule, UsersModule, AuthModule, SemestersModule, CoursesModule],
  controllers: [HealthController],
})
export class AppModule {}
