-- CreateTable
CREATE TABLE "workspaces" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" VARCHAR(100) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "workspaces_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "api_keys" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "workspace_id" UUID NOT NULL,
    "label" VARCHAR(100) NOT NULL,
    "key_hash" VARCHAR(64) NOT NULL,
    "prefix" VARCHAR(8) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revoked_at" TIMESTAMPTZ,

    CONSTRAINT "api_keys_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "channels" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "workspace_id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "provider_type" VARCHAR(20) NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'CREATED',
    "config" JSONB NOT NULL DEFAULT '{}',
    "encrypted_creds" BYTEA,
    "creds_algorithm" VARCHAR(10),
    "creds_key_version" INTEGER,
    "failure_code" VARCHAR(20),
    "failure_message" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "channels_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "messages" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "workspace_id" UUID NOT NULL,
    "channel_id" UUID NOT NULL,
    "direction" VARCHAR(10) NOT NULL,
    "to_phone" VARCHAR(20) NOT NULL,
    "from_phone" VARCHAR(20),
    "content_type" VARCHAR(20) NOT NULL,
    "content_body" TEXT NOT NULL,
    "media_url" TEXT,
    "mime_type" VARCHAR(50),
    "template_id" VARCHAR(100),
    "template_params" JSONB,
    "status" VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    "idempotency_key" VARCHAR(100) NOT NULL,
    "provider_external_id" VARCHAR(200),
    "provider_timestamp" TIMESTAMPTZ,
    "retry_max_attempts" INTEGER NOT NULL DEFAULT 5,
    "retry_backoff_base_ms" INTEGER NOT NULL DEFAULT 1000,
    "retry_backoff_multiplier" DOUBLE PRECISION NOT NULL DEFAULT 2.0,
    "failure_category" VARCHAR(30),
    "failure_message" TEXT,
    "failure_retryable" BOOLEAN,
    "scheduled_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "delivery_attempts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "message_id" UUID NOT NULL,
    "attempt_number" INTEGER NOT NULL,
    "status" VARCHAR(20) NOT NULL,
    "provider_response" TEXT,
    "failure_code" VARCHAR(50),
    "failure_message" TEXT,
    "failure_retryable" BOOLEAN,
    "started_at" TIMESTAMPTZ NOT NULL,
    "completed_at" TIMESTAMPTZ,
    "duration_ms" INTEGER,

    CONSTRAINT "delivery_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "outbox_events" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "event_type" VARCHAR(100) NOT NULL,
    "aggregate_type" VARCHAR(100) NOT NULL,
    "aggregate_id" UUID NOT NULL,
    "workspace_id" UUID,
    "payload" JSONB NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    "retry_count" INTEGER NOT NULL DEFAULT 0,
    "last_error" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "published_at" TIMESTAMPTZ,

    CONSTRAINT "outbox_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "webhook_configs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "workspace_id" UUID NOT NULL,
    "url" TEXT NOT NULL,
    "secret_hash" VARCHAR(64) NOT NULL,
    "event_types" JSONB NOT NULL DEFAULT '[]',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "retry_max_attempts" INTEGER NOT NULL DEFAULT 3,
    "retry_delay_ms" INTEGER NOT NULL DEFAULT 1000,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "webhook_configs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "api_keys_key_hash_key" ON "api_keys"("key_hash");

-- CreateIndex
CREATE INDEX "idx_apikey_workspace" ON "api_keys"("workspace_id");

-- CreateIndex
CREATE INDEX "idx_channel_workspace" ON "channels"("workspace_id");

-- CreateIndex
CREATE INDEX "idx_channel_workspace_status" ON "channels"("workspace_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "messages_idempotency_key_key" ON "messages"("idempotency_key");

-- CreateIndex
CREATE INDEX "idx_message_channel" ON "messages"("channel_id");

-- CreateIndex
CREATE INDEX "idx_message_workspace_created" ON "messages"("workspace_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "idx_message_status" ON "messages"("status");

-- CreateIndex
CREATE INDEX "idx_attempt_message" ON "delivery_attempts"("message_id");

-- CreateIndex
CREATE INDEX "idx_outbox_pending" ON "outbox_events"("status", "created_at");

-- CreateIndex
CREATE INDEX "idx_outbox_aggregate" ON "outbox_events"("aggregate_type", "aggregate_id");

-- CreateIndex
CREATE INDEX "idx_webhook_workspace" ON "webhook_configs"("workspace_id");

-- AddForeignKey
ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "channels" ADD CONSTRAINT "channels_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_channel_id_fkey" FOREIGN KEY ("channel_id") REFERENCES "channels"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "delivery_attempts" ADD CONSTRAINT "delivery_attempts_message_id_fkey" FOREIGN KEY ("message_id") REFERENCES "messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "outbox_events" ADD CONSTRAINT "outbox_events_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "webhook_configs" ADD CONSTRAINT "webhook_configs_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
