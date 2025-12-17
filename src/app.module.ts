import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { HealthController } from './health.controller';

@Module({
  imports: [PrismaModule, UsersModule, AuthModule],
  controllers: [HealthController],
})
export class AppModule {}
