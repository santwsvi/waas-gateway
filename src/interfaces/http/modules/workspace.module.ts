import { Module } from '@nestjs/common';
import { WORKSPACE_REPOSITORY } from '@domain/workspace/ports/workspace-repository.port.js';
import { OUTBOX_REPOSITORY } from '@domain/shared/ports/outbox-repository.port.js';
import { CreateWorkspaceUseCase } from '@app/workspace/create-workspace.use-case.js';
import { WorkspaceController } from '../controllers/workspace.controller.js';

@Module({
  controllers: [WorkspaceController],
  providers: [
    {
      provide: CreateWorkspaceUseCase,
      useFactory: (workspaceRepo: unknown, outboxRepo: unknown) =>
        new CreateWorkspaceUseCase(
          workspaceRepo as ConstructorParameters<typeof CreateWorkspaceUseCase>[0],
          outboxRepo as ConstructorParameters<typeof CreateWorkspaceUseCase>[1],
        ),
      inject: [WORKSPACE_REPOSITORY, OUTBOX_REPOSITORY],
    },
  ],
})
export class WorkspaceModule {}
