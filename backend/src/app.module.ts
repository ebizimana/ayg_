import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { HealthController } from './health.controller';
import { SemestersModule } from './modules/semesters/semesters.module';
import { CoursesModule } from './modules/courses/courses.module';
import { CategoriesModule } from './modules/categories/categories.module';
import { AssignmentsModule } from './modules/assignments/assignments.module';
import { GradesModule } from './modules/grades/grades.module';
import { TargetGpaModule } from './modules/target-gpa/target-gpa.module';
import { YearsModule } from './modules/years/years.module';
import { WebhooksModule } from './modules/webhooks/webhooks.module';

@Module({
  imports: [
    PrismaModule,
    UsersModule,
    AuthModule,
    SemestersModule,
    CoursesModule,
    YearsModule,
    CategoriesModule,
    AssignmentsModule,
    GradesModule,
    TargetGpaModule,
    WebhooksModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
