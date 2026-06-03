import { IsString, IsNotEmpty, MaxLength } from 'class-validator';

export class CreateWorkspaceDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name!: string;
}
