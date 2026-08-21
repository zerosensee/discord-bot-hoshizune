import {
  ChatInputCommandInteraction,
  EmbedBuilder,
  InteractionResponse,
  SlashCommandBuilder,
} from 'discord.js';

import { SlashCommand } from '@/base';
import { BotClient } from '@/bot-client';

import { COLORS, EMOJIS } from '@/shared/constants';

export default class PingCommand extends SlashCommand {
  public constructor() {
    super(
      new SlashCommandBuilder()
        .setName('ping')
        .setDescription('Calculate ping') as SlashCommandBuilder,
    );
  }

  public async chatInput(
    botClient: BotClient,
    interaction: ChatInputCommandInteraction,
  ): Promise<InteractionResponse | void> {
    await interaction.deferReply();

    const botLatency = Date.now() - interaction.createdTimestamp;
    const gatewayLatency = botClient.ws.ping;

    const botAvatar = interaction.client.user.displayAvatarURL();
    const userAvatar = interaction.user.displayAvatarURL();

    const userTag = interaction.user.tag;

    const embed = new EmbedBuilder()
      .setColor(COLORS.PRIMARY)
      .setDescription(
        `### ${EMOJIS.PING} ${interaction.client.user.username} Ping`,
      )
      .addFields(
        {
          name: '> Bot Latency',
          value: `${botLatency}ms`,
          inline: true,
        },
        {
          name: '> Gateway Latency',
          value: `${gatewayLatency}ms`,
          inline: true,
        },
      )
      .setThumbnail(botAvatar)
      .setFooter({
        text: `Requested by ${userTag}`,
        iconURL: userAvatar,
      })
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  }
}
