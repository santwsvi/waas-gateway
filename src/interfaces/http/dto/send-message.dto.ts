import {
  IsString,
  IsNotEmpty,
  IsUUID,
  IsOptional,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

class MessageContentDto {
  @IsString()
  @IsNotEmpty()
  type!: string;

  @IsString()
  @IsOptional()
  body?: string;

  @IsString()
  @IsOptional()
  url?: string;

  @IsString()
  @IsOptional()
  mimeType?: string;

  @IsString()
  @IsOptional()
  caption?: string;

  @IsString()
  @IsOptional()
  templateName?: string;

  @IsString()
  @IsOptional()
  language?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  parameters?: string[];
}

export class SendMessageDto {
  @IsUUID()
  @IsNotEmpty()
  workspaceId!: string;

  @IsUUID()
  @IsNotEmpty()
  channelId!: string;

  @IsString()
  @IsNotEmpty()
  to!: string;

  @ValidateNested()
  @Type(() => MessageContentDto)
  content!: MessageContentDto;

  @IsString()
  @IsNotEmpty()
  idempotencyKey!: string;
}
