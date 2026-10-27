import { describe, expect, it } from 'vitest';
import { validateCommand, validateSettings } from './producer-settings-validator.util';
import { WorkerCommands } from '../enums/worker-commands.enum';
import { IProducerSettings } from '../../shared/interfaces/producer-settings.interface';
import { DEFAULT_SETTINGS } from '../constants/defaults.constant';

const VALID = { isValid: true, message: '' };
const INTERVAL_ERROR = 'Batch interval should be integer and in range 50ms - 2000ms';
const COUNT_ERROR = 'Instrument count should be integer and in range 1 - 50';
const BATCH_ERROR = 'Updates per batch should be integer and in range 1 - 1000';

describe('validateCommand()', () => {
  it.each(Object.values(WorkerCommands))('accepts %s', (command) => {
    expect(validateCommand(command)).toEqual(VALID);
  });

  it('rejects an unknown command', () => {
    expect(validateCommand('restart' as WorkerCommands)).toEqual({
      isValid: false,
      message: 'Invalid command type',
    });
  });
});

describe('validateSettings()', () => {
  it('accepts the defaults', () => {
    expect(validateSettings(DEFAULT_SETTINGS)).toEqual(VALID);
  });

  it('accepts the boundaries of every range', () => {
    expect(validateSettings({ instrumentCount: 1, updatesPerBatch: 1, batchIntervalMs: 50 })).toEqual(VALID);
    expect(validateSettings({ instrumentCount: 50, updatesPerBatch: 1000, batchIntervalMs: 2000 })).toEqual(
      VALID,
    );
  });

  it('rejects missing settings', () => {
    expect(validateSettings(undefined as unknown as IProducerSettings)).toEqual({
      isValid: false,
      message: 'Producer Settings are empty',
    });
  });

  it.each<[string, Partial<IProducerSettings>, string]>([
    ['interval below 50', { batchIntervalMs: 49 }, INTERVAL_ERROR],
    ['interval above 2000', { batchIntervalMs: 2001 }, INTERVAL_ERROR],
    ['fractional interval', { batchIntervalMs: 100.5 }, INTERVAL_ERROR],
    ['instrument count 0', { instrumentCount: 0 }, COUNT_ERROR],
    ['instrument count above 50', { instrumentCount: 51 }, COUNT_ERROR],
    ['fractional instrument count', { instrumentCount: 2.5 }, COUNT_ERROR],
    ['updates per batch 0', { updatesPerBatch: 0 }, BATCH_ERROR],
    ['updates per batch above 1000', { updatesPerBatch: 1001 }, BATCH_ERROR],
    ['fractional updates per batch', { updatesPerBatch: 1.5 }, BATCH_ERROR],
    ['missing value', { updatesPerBatch: undefined }, BATCH_ERROR],
  ])('rejects %s', (_, override, message) => {
    expect(validateSettings({ ...DEFAULT_SETTINGS, ...override } as IProducerSettings)).toEqual({
      isValid: false,
      message,
    });
  });

  it('reports the first failing field only', () => {
    expect(validateSettings({ instrumentCount: 0, updatesPerBatch: 0, batchIntervalMs: 0 }).message).toBe(
      INTERVAL_ERROR,
    );
  });
});
