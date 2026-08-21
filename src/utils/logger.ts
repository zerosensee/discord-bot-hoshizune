import process from 'node:process';

import winston, { Logger } from 'winston';

const { combine, timestamp, printf, colorize } = winston.format;

const customPrint = printf(
  ({ timestamp, level, service, message }) =>
    `${timestamp}  ${level} ${service}: ${message}`,
);

export function createLogger(serviceName: string): Logger {
  return winston.createLogger({
    level: process.env.LOG_LEVEL ?? 'info',
    defaultMeta: { service: serviceName },
    format: combine(
      timestamp({ format: 'YYYY-MM-DD hh:mm:ss.SSS' }),
      colorize({ all: true }),
      customPrint,
    ),
    transports: [new winston.transports.Console()],
  });
}
