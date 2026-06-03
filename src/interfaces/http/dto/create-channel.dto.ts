import { IsString, IsNotEmpty, IsUUID, MaxLength } from 'class-validator';

export class CreateChannelDto {
  @IsUUID()
  @IsNotEmpty()
  workspaceId!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name!: string;

  @IsString()
  @IsNotEmpty()
  providerType!: string;
}
