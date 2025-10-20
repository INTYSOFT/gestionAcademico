import { parseEvaluacionDetalleNumber } from './evaluacion-detalles.service';

describe('parseEvaluacionDetalleNumber', () => {
    it('should return null for null or undefined values', () => {
        expect(parseEvaluacionDetalleNumber(null)).toBeNull();
        expect(parseEvaluacionDetalleNumber(undefined)).toBeNull();
    });

    it('should keep numeric values as-is', () => {
        expect(parseEvaluacionDetalleNumber(0)).toBe(0);
        expect(parseEvaluacionDetalleNumber(15)).toBe(15);
        expect(parseEvaluacionDetalleNumber(-3.5)).toBe(-3.5);
    });

    it('should parse strings with decimal point', () => {
        expect(parseEvaluacionDetalleNumber('1.5')).toBeCloseTo(1.5);
        expect(parseEvaluacionDetalleNumber('-0.25')).toBeCloseTo(-0.25);
    });

    it('should parse strings with decimal comma', () => {
        expect(parseEvaluacionDetalleNumber('1,5')).toBeCloseTo(1.5);
        expect(parseEvaluacionDetalleNumber('-,25')).toBeCloseTo(-0.25);
    });

    it('should parse european formatted numbers', () => {
        expect(parseEvaluacionDetalleNumber('1.234,56')).toBeCloseTo(1234.56);
        expect(parseEvaluacionDetalleNumber('1.234.567,89')).toBeCloseTo(1234567.89);
        expect(parseEvaluacionDetalleNumber('1 234,56')).toBeCloseTo(1234.56);
    });

    it('should parse us formatted numbers', () => {
        expect(parseEvaluacionDetalleNumber('1,234.56')).toBeCloseTo(1234.56);
        expect(parseEvaluacionDetalleNumber('1,234,567.89')).toBeCloseTo(1234567.89);
    });

    it('should return null for invalid strings', () => {
        expect(parseEvaluacionDetalleNumber('')).toBeNull();
        expect(parseEvaluacionDetalleNumber('   ')).toBeNull();
        expect(parseEvaluacionDetalleNumber('abc')).toBeNull();
        expect(parseEvaluacionDetalleNumber('--12')).toBeNull();
    });
});
