import {
  ActionRowBuilder,
  ActivityType,
  ButtonBuilder,
  ButtonStyle,
  ChatInputCommandInteraction,
  EmbedBuilder,
  MessageFlags,
  ModalBuilder,
  SlashCommandBuilder,
  StringSelectMenuBuilder,
  TextInputBuilder,
  TextInputStyle,
} from 'discord.js';

import { SlashCommand } from '@/base';
import { BotClient } from '@/bot-client';
import { COLORS, EMOJIS, USERS } from '@/shared/constants';

/**
 * Команда управления активностью и статусом бота (доступна только владельцу).
 */
export default class BotActivityCommand extends SlashCommand {
  public constructor() {
    super(
      new SlashCommandBuilder()
        .setName('bot_activity')
        .setDescription('Управление активностью и статусом бота') as SlashCommandBuilder,
    );
  }

  /**
   * Проверка прав владельца или разработчика бота.
   * @param botClient - Клиент бота
   * @param userId - ID пользователя Discord
   * @returns true, если пользователь является владельцем или разработчиком
   */
  private async checkIsOwner(
    botClient: BotClient,
    userId: string,
  ): Promise<boolean> {
    if (USERS.OWNER === userId || USERS.DEVELOPERS.includes(userId)) {
      return true;
    }

    const app = await botClient.application?.fetch().catch(() => null);
    if (!app) return false;

    if (app.owner) {
      if ('members' in app.owner) {
        return app.owner.members.has(userId);
      }
      return app.owner.id === userId;
    }

    return false;
  }

  /**
   * Точка входа для выполнения команды /bot_activity.
   * @param botClient - Экземпляр клиента бота
   * @param interaction - Интеракция slash-команды
   */
  public async chatInput(
    botClient: BotClient,
    interaction: ChatInputCommandInteraction,
  ): Promise<void> {
    await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });

    const isOwner = await this.checkIsOwner(botClient, interaction.user.id);
    if (!isOwner) {
      await interaction.editReply({
        content: '⛔ Эта команда доступна только владельцу бота.',
      });
      return;
    }

    const presenceService = botClient.presenceService;

    const buildEmbed = (): EmbedBuilder => {
      const isMix = presenceService.getIsMixActive();
      const current = presenceService.getCurrentActivity();

      const statusText = isMix
        ? '🔄 **Mix-режим включен** (автоматическая смена раз в 10 минут)'
        : current
          ? `📌 **Текущая активность:** ${current.name}`
          : '⚪ **Стандартный статус**';

      return new EmbedBuilder()
        .setColor(COLORS.PRIMARY)
        .setTitle(`${EMOJIS.SHIELD} Управление активностью и статусом бота`)
        .setDescription(
          [
            statusText,
            '',
            '🎮 **Популярные игры:** Выберите игру из списка ниже для мгновенной установки.',
            '🔄 **Mix-режим:** Включает регулярное случайное переключение активностей.',
            '✍️ **Своя активность:** Нажмите кнопку для создания своего статуса (игра, стрим и др.).',
            '🛑 **Сбросить статус:** Возвращает обычный онлайн статус бота.',
          ].join('\n'),
        )
        .setFooter({ text: 'Панель управления владельца бота Hoshizune' });
    };

    const buildComponents = (): [
      ActionRowBuilder<StringSelectMenuBuilder>,
      ActionRowBuilder<ButtonBuilder>,
    ] => {
      const isMix = presenceService.getIsMixActive();

      const presetSelect = new StringSelectMenuBuilder()
        .setCustomId(`presence:preset:${interaction.user.id}`)
        .setPlaceholder('Выберите игру или статус из предустановленных')
        .addOptions(
          presenceService.presets.map((preset) => ({
            label: preset.name.slice(0, 100),
            value: preset.id,
            description: `Тип: ${ActivityType[preset.type]}`.slice(0, 100),
          })),
        );

      const buttonsRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId(`presence:mix:${interaction.user.id}`)
          .setLabel(isMix ? 'Выключить Mix' : 'Включить Mix-режим')
          .setStyle(isMix ? ButtonStyle.Danger : ButtonStyle.Success)
          .setEmoji('🔄'),
        new ButtonBuilder()
          .setCustomId(`presence:custom:${interaction.user.id}`)
          .setLabel('Своя активность')
          .setStyle(ButtonStyle.Primary)
          .setEmoji('✍️'),
        new ButtonBuilder()
          .setCustomId(`presence:reset:${interaction.user.id}`)
          .setLabel('Сбросить статус')
          .setStyle(ButtonStyle.Secondary)
          .setEmoji('🛑'),
      );

      const selectRow = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
        presetSelect,
      );

      return [selectRow, buttonsRow];
    };

    const responseMsg = await interaction.editReply({
      embeds: [buildEmbed()],
      components: buildComponents(),
    });

    const collector = responseMsg.createMessageComponentCollector({
      time: 15 * 60 * 1000,
    });

    collector.on('collect', async (i) => {
      if (i.user.id !== interaction.user.id) {
        await i.reply({
          flags: [MessageFlags.Ephemeral],
          content: 'Эта панель принадлежит владельцу бота.',
        });
        return;
      }

      const [, action] = i.customId.split(':');

      if (i.isStringSelectMenu() && action === 'preset') {
        await i.deferUpdate().catch(() => null);
        const selectedId = i.values[0];
        const preset = presenceService.presets.find((p) => p.id === selectedId);

        if (preset) {
          presenceService.setActivity(preset);
          await i.editReply({
            embeds: [buildEmbed()],
            components: buildComponents(),
          });
          await i.followUp({
            flags: [MessageFlags.Ephemeral],
            content: `✅ Активность изменена на: **${preset.name}**`,
          });
        }
        return;
      }

      if (i.isButton() && action === 'mix') {
        await i.deferUpdate().catch(() => null);
        const newMixState = presenceService.toggleMixMode();
        await i.editReply({
          embeds: [buildEmbed()],
          components: buildComponents(),
        });
        await i.followUp({
          flags: [MessageFlags.Ephemeral],
          content: newMixState
            ? '🔄 **Mix-режим запущен!** Активности бота сменяются каждые 10 минут.'
            : '🛑 **Mix-режим остановлен.**',
        });
        return;
      }

      if (i.isButton() && action === 'reset') {
        await i.deferUpdate().catch(() => null);
        presenceService.resetPresence();
        await i.editReply({
          embeds: [buildEmbed()],
          components: buildComponents(),
        });
        await i.followUp({
          flags: [MessageFlags.Ephemeral],
          content: '⚪ Статус активности бота успешно сброшен.',
        });
        return;
      }

      if (i.isButton() && action === 'custom') {
        const modal = new ModalBuilder()
          .setCustomId(`presence:modal:${interaction.user.id}`)
          .setTitle('Создать свою активность')
          .addComponents(
            new ActionRowBuilder<TextInputBuilder>().addComponents(
              new TextInputBuilder()
                .setCustomId('name')
                .setLabel('Название активности (игры / статус)')
                .setPlaceholder('Например: Dota 2 или Hoshizune Live')
                .setStyle(TextInputStyle.Short)
                .setRequired(true),
            ),
            new ActionRowBuilder<TextInputBuilder>().addComponents(
              new TextInputBuilder()
                .setCustomId('type')
                .setLabel('Тип: Playing, Streaming, Listening, Watching')
                .setPlaceholder('Playing')
                .setStyle(TextInputStyle.Short)
                .setRequired(true),
            ),
            new ActionRowBuilder<TextInputBuilder>().addComponents(
              new TextInputBuilder()
                .setCustomId('url')
                .setLabel('Ссылка Twitch (если тип Streaming)')
                .setPlaceholder('https://www.twitch.tv/hoshizune')
                .setStyle(TextInputStyle.Short)
                .setRequired(false),
            ),
          );

        await i.showModal(modal);

        const modalSubmit = await i
          .awaitModalSubmit({
            time: 2 * 60 * 1000,
            filter: (submitted) =>
              submitted.customId === `presence:modal:${interaction.user.id}` &&
              submitted.user.id === interaction.user.id,
          })
          .catch(() => null);

        if (!modalSubmit) return;

        await modalSubmit.deferUpdate().catch(() => null);

        const nameInput = modalSubmit.fields.getTextInputValue('name').trim();
        const typeInputRaw = modalSubmit.fields.getTextInputValue('type').trim().toLowerCase();
        const urlInput = modalSubmit.fields.getTextInputValue('url').trim();

        let type = ActivityType.Playing;
        if (typeInputRaw.includes('custom')) type = ActivityType.Custom;
        else if (typeInputRaw.includes('stream')) type = ActivityType.Streaming;
        else if (typeInputRaw.includes('listen')) type = ActivityType.Listening;
        else if (typeInputRaw.includes('watch')) type = ActivityType.Watching;
        else if (typeInputRaw.includes('compete')) type = ActivityType.Competing;

        const customActivity = presenceService.addCustomActivity(
          nameInput,
          type,
          urlInput || undefined,
        );

        await i.editReply({
          embeds: [buildEmbed()],
          components: buildComponents(),
        });

        await modalSubmit.followUp({
          flags: [MessageFlags.Ephemeral],
          content: `✅ Установлена новая пользовательская активность: **${customActivity.name}**`,
        });
        return;
      }
    });

    collector.on('end', async () => {
      await responseMsg.edit({ components: [] }).catch(() => undefined);
    });
  }
}
