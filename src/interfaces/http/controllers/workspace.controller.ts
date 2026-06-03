import { Controller, Post, Body, Inject } from '@nestjs/common';
import { CreateWorkspaceUseCase } from '@app/workspace/create-workspace.use-case.js';
import { CreateWorkspaceDto } from '../dto/create-workspace.dto.js';

@Controller('workspaces')
export class WorkspaceController {
  constructor(
    @Inject(CreateWorkspaceUseCase)
    private readonly createWorkspace: CreateWorkspaceUseCase,
  ) {}

  @Post()
  async create(@Body() dto: CreateWorkspaceDto) {
    return this.createWorkspace.execute({ name: dto.name });
  }
}
