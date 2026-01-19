import { IsEnum } from 'class-validator';
import { UserTier } from '@prisma/client';

export class UpdateTierDto {
  @IsEnum(UserTier)
  tier: UserTier;
}
