-- Модернизация схемы базы данных discord-bot-hoshizune

-- Таблица hoshizune_guilds
CREATE TABLE IF NOT EXISTS "hoshizune_guilds" (
    "id" TEXT NOT NULL,
    "discord_id" TEXT NOT NULL,
    "auto_role" TEXT[],
    "stats_channel_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "hoshizune_guilds_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "hoshizune_guilds_discord_id_key" ON "hoshizune_guilds"("discord_id");

-- Таблица hoshizune_reaction_role_messages
CREATE TABLE IF NOT EXISTS "hoshizune_reaction_role_messages" (
    "id" TEXT NOT NULL,
    "guild_id" TEXT NOT NULL,
    "channel_id" TEXT NOT NULL,
    "message_id" TEXT NOT NULL,
    "mappings" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "hoshizune_reaction_role_messages_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "hoshizune_reaction_role_messages_guild_id_channel_id_mess_key" ON "hoshizune_reaction_role_messages"("guild_id", "channel_id", "message_id");
CREATE INDEX IF NOT EXISTS "hoshizune_reaction_role_messages_guild_id_idx" ON "hoshizune_reaction_role_messages"("guild_id");
CREATE INDEX IF NOT EXISTS "hoshizune_reaction_role_messages_channel_id_idx" ON "hoshizune_reaction_role_messages"("channel_id");

-- Таблица hoshizune_channel_stats
CREATE TABLE IF NOT EXISTS "hoshizune_channel_stats" (
    "id" TEXT NOT NULL,
    "guild_id" TEXT NOT NULL,
    "channel_id" TEXT NOT NULL,
    "date" DATE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "count" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "hoshizune_channel_stats_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "hoshizune_channel_stats_guild_id_channel_id_date_key" ON "hoshizune_channel_stats"("guild_id", "channel_id", "date");
CREATE INDEX IF NOT EXISTS "hoshizune_channel_stats_guild_id_idx" ON "hoshizune_channel_stats"("guild_id");
CREATE INDEX IF NOT EXISTS "hoshizune_channel_stats_date_idx" ON "hoshizune_channel_stats"("date");
CREATE INDEX IF NOT EXISTS "hoshizune_channel_stats_guild_id_date_idx" ON "hoshizune_channel_stats"("guild_id", "date");

-- Внешние ключи с каскадным удалением
ALTER TABLE "hoshizune_reaction_role_messages" ADD CONSTRAINT "hoshizune_reaction_role_messages_guild_id_fkey" FOREIGN KEY ("guild_id") REFERENCES "hoshizune_guilds"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "hoshizune_channel_stats" ADD CONSTRAINT "hoshizune_channel_stats_guild_id_fkey" FOREIGN KEY ("guild_id") REFERENCES "hoshizune_guilds"("id") ON DELETE CASCADE ON UPDATE CASCADE;
