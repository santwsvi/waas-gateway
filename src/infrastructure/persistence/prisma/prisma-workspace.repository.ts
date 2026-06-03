import { Injectable } from '@nestjs/common';
import type { IWorkspaceRepository } from '@domain/workspace/ports/workspace-repository.port.js';
import { Workspace } from '@domain/workspace/workspace.aggregate.js';
import type { ApiKeyData } from '@domain/workspace/workspace.aggregate.js';
import { PrismaService } from './prisma.service.js';

@Injectable()
export class PrismaWorkspaceRepository implements IWorkspaceRepository {
  constructor(private readonly prisma: PrismaService) {}

  async save(workspace: Workspace): Promise<void> {
    const apiKeys = workspace.apiKeys;

    await this.prisma.$transaction(async (tx) => {
      await tx.workspace.upsert({
        where: { id: workspace.id },
        create: {
          id: workspace.id,
          name: workspace.name,
          isActive: workspace.isActive,
          createdAt: workspace.createdAt,
          updatedAt: workspace.updatedAt,
        },
        update: {
          name: workspace.name,
          isActive: workspace.isActive,
          updatedAt: workspace.updatedAt,
        },
      });

      await tx.apiKey.deleteMany({ where: { workspaceId: workspace.id } });

      if (apiKeys.length > 0) {
        await tx.apiKey.createMany({
          data: apiKeys.map((k) => ({
            id: k.id,
            workspaceId: workspace.id,
            keyHash: k.keyHash,
            label: k.label,
            prefix: k.keyHash.substring(0, 8),
            isActive: !k.revoked,
            createdAt: k.createdAt,
            revokedAt: k.revoked ? new Date() : null,
          })),
        });
      }
    });
  }

  async findById(id: string): Promise<Workspace | null> {
    const row = await this.prisma.workspace.findUnique({
      where: { id },
      include: { apiKeys: true },
    });

    if (!row) return null;
    return this.toDomain(row);
  }

  async findAll(): Promise<Workspace[]> {
    const rows = await this.prisma.workspace.findMany({
      include: { apiKeys: true },
    });

    return rows.map((r) => this.toDomain(r));
  }

  private toDomain(
    row: {
      id: string;
      name: string;
      isActive: boolean;
      createdAt: Date;
      updatedAt: Date;
      apiKeys: Array<{
        id: string;
        keyHash: string;
        label: string;
        isActive: boolean;
        createdAt: Date;
        revokedAt: Date | null;
      }>;
    },
  ): Workspace {
    const apiKeys: ApiKeyData[] = row.apiKeys.map((k) => ({
      id: k.id,
      keyHash: k.keyHash,
      label: k.label,
      revoked: !k.isActive,
      createdAt: k.createdAt,
    }));

    return Workspace.reconstitute({
      id: row.id,
      name: row.name,
      isActive: row.isActive,
      apiKeys,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  }
}
