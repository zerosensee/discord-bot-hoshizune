import os from 'node:os'

import {
  ChatInputCommandInteraction,
  EmbedBuilder,
  InteractionResponse,
  SlashCommandBuilder,
} from 'discord.js'

import { SlashCommand } from '@/base'
import { BotClient } from '@/bot-client'
import { COLORS, EMOJIS, URLS, USERS } from '@/shared/constants'

export default class AboutCommand extends SlashCommand {
  public constructor() {
    super(
      new SlashCommandBuilder()
        .setName('about')
        .setDescription('Get information about bot') as SlashCommandBuilder,
    );
  }

  public async chatInput(
    botClient: BotClient,
    interaction: ChatInputCommandInteraction,
  ): Promise<InteractionResponse | void> {
    const bot = interaction.client.user;

    const embed = new EmbedBuilder()
      .setColor(COLORS.PRIMARY)
      .setAuthor({
        name: bot.username,
        iconURL: bot.displayAvatarURL(),
      })
      .setDescription(
        'Hello! I am Hoshizune, your new best friend, who will make your time on the server brighter and more enjoyable.',
      )
      .setThumbnail(bot.displayAvatarURL())
      .setFields([
        {
          name: '> Owner',
          value: `**・** <@${USERS.OWNER}>`,
          inline: true,
        },
        {
          name: '> Developers',
          value: USERS.DEVELOPERS.map((id) => `**・** <@${id}>`).join('\n'),
          inline: false,
        },
        {
          name: '> Stack',
          value: `${EMOJIS.DISCORDJS} Discord.js 14.16.3, ${EMOJIS.TYPESCRIPT} Typescript 5.7.2`,
          inline: false,
        },
        {
          name: '> Server',
          value: `**・** ${EMOJIS.PLATFORM} Platform: ${os.platform()} ${os.arch()}\n**・** ${EMOJIS.TYPE} Type: ${os.type()}\n**・** ${EMOJIS.RELEASE} Release: ${os.release()}`,
        },
        {
          name: '> Links',
          value: `**・** ${EMOJIS.BOOSTY} [Boosty](${URLS.BOOSTY})\n**・** ${EMOJIS.TELEGRAM} [Telegram](${URLS.TELEGRAM})\n**・** ${EMOJIS.GITHUB} [GitHub](${URLS.GITHUB})`,
          inline: true,
        },
      ])
      .setTimestamp(bot.createdTimestamp);

    return interaction.reply({ embeds: [embed] });
  }
}
