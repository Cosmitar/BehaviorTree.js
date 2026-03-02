import { FAILURE, RUNNING, SUCCESS } from '../constants';
import EffectDecorator from './EffectDecorator';

describe('EffectDecorator', () => {
  let blackboard: { count: number; flag: boolean };
  let mockRun: jest.Mock;

  beforeEach(() => {
    blackboard = { count: 0, flag: false };
    mockRun = jest.fn();
  });

  describe('constructor', () => {
    it('should create an instance with nodeType EffectDecorator', () => {
      const decorator = new EffectDecorator({ config: { effects: [] } });
      expect(decorator.nodeType).toBe('EffectDecorator');
    });
  });

  describe('decorate', () => {
    it('should return RUNNING without applying effects when child returns RUNNING', () => {
      mockRun.mockReturnValue(RUNNING);
      const decorator = new EffectDecorator({
        config: {
          effects: [{ prop: 'count', value: 10 }]
        }
      });

      const result = decorator.decorate(mockRun, blackboard);

      expect(result).toBe(RUNNING);
      expect(blackboard.count).toBe(0);
    });

    it('should apply effects on SUCCESS when type is SUCCESS', () => {
      mockRun.mockReturnValue(SUCCESS);
      const decorator = new EffectDecorator({
        config: {
          type: SUCCESS,
          effects: [
            { prop: 'count', value: 5 },
            { prop: 'flag', value: true }
          ]
        }
      });

      const result = decorator.decorate(mockRun, blackboard);

      expect(result).toBe(SUCCESS);
      expect(blackboard.count).toBe(5);
      expect(blackboard.flag).toBe(true);
    });

    it('should not apply effects on FAILURE when type is SUCCESS', () => {
      mockRun.mockReturnValue(FAILURE);
      const decorator = new EffectDecorator({
        config: {
          type: SUCCESS,
          effects: [{ prop: 'count', value: 10 }]
        }
      });

      const result = decorator.decorate(mockRun, blackboard);

      expect(result).toBe(FAILURE);
      expect(blackboard.count).toBe(0);
    });

    it('should apply effects on FAILURE when type is FAILURE', () => {
      mockRun.mockReturnValue(FAILURE);
      const decorator = new EffectDecorator({
        config: {
          type: FAILURE,
          effects: [{ prop: 'flag', value: true }]
        }
      });

      const result = decorator.decorate(mockRun, blackboard);

      expect(result).toBe(FAILURE);
      expect(blackboard.flag).toBe(true);
    });

    it('should not apply effects on SUCCESS when type is FAILURE', () => {
      mockRun.mockReturnValue(SUCCESS);
      const decorator = new EffectDecorator({
        config: {
          type: FAILURE,
          effects: [{ prop: 'count', value: 10 }]
        }
      });

      const result = decorator.decorate(mockRun, blackboard);

      expect(result).toBe(SUCCESS);
      expect(blackboard.count).toBe(0);
    });

    it('should apply effects on both SUCCESS and FAILURE when type is "both"', () => {
      mockRun.mockReturnValue(SUCCESS);
      const decorator = new EffectDecorator({
        config: {
          type: 'both',
          effects: [{ prop: 'count', value: 7 }]
        }
      });

      let result = decorator.decorate(mockRun, blackboard);
      expect(result).toBe(SUCCESS);
      expect(blackboard.count).toBe(7);

      blackboard.count = 0;
      mockRun.mockReturnValue(FAILURE);
      result = decorator.decorate(mockRun, blackboard);
      expect(result).toBe(FAILURE);
      expect(blackboard.count).toBe(7);
    });

    it('should apply effects on SUCCESS when type is not specified (defaults to SUCCESS)', () => {
      mockRun.mockReturnValue(SUCCESS);
      const decorator = new EffectDecorator({
        config: {
          effects: [{ prop: 'count', value: 3 }]
        }
      });

      const result = decorator.decorate(mockRun, blackboard);

      expect(result).toBe(SUCCESS);
      expect(blackboard.count).toBe(3);
    });

    it('should handle empty effects array', () => {
      mockRun.mockReturnValue(SUCCESS);
      const decorator = new EffectDecorator({
        config: {
          effects: []
        }
      });

      const result = decorator.decorate(mockRun, blackboard);

      expect(result).toBe(SUCCESS);
      expect(blackboard.count).toBe(0);
      expect(blackboard.flag).toBe(false);
    });
  });
});
