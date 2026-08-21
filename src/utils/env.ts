import process from 'node:process';

import { plainToInstance } from 'class-transformer';
import { IsString, validate } from 'class-validator';

import { createLogger } from './logger';

class EnvVariables {
  @IsString()
  DISCORD_APPLICATION_ID!: string;

  @IsString()
  DISCORD_BOT_TOKEN!: string;
}

class Environment {
  private variables: EnvVariables | null = null;
  private logger = createLogger('environment');

  public async prepare(): Promise<void> {
    if (process.env.NODE_ENV === 'development') {
      (await import('dotenv')).config();
    }

    const variables = plainToInstance(EnvVariables, process.env);
    const errors = await validate(variables, { skipMissingProperties: false });

    if (errors.length > 0) {
      errors.forEach((error) => {
        if (error.constraints) {
          Object.keys(error.constraints).forEach((key) => {
            this.logger.error(
              `Variable validation failed for ${error.property}: ${error.constraints![key]}`,
            );
          });
        }
      });

      this.logger.error('Validation failed. Exiting process.');
      process.exit(1);
    }

    this.variables = variables;
  }

  public get<K extends keyof EnvVariables>(
    key: K,
  ): EnvVariables[K] | undefined {
    if (!this.variables) {
      throw new Error('Environment is not prepared');
    }

    return this.variables[key];
  }

  public getOrThrow<K extends keyof EnvVariables>(key: K): EnvVariables[K] {
    const value = this.get(key);

    if (value === undefined) {
      throw new Error(`Environment variable ${key} is missing`);
    }

    return value;
  }
}

export const env = new Environment();
