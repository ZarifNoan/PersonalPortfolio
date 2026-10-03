import { describe, it, expect } from 'vitest';
import { faceLines } from '../../src/lib/badgeText';

describe('faceLines (shared by the 3D card face and the static badge)', () => {
  it('splits the full name into two given-name lines and the patronymic', () => {
    expect(faceLines('Muhammad Zarif Nurhan Bin Mohd Arifin', 'Computer Science · 3D Visualization')).toEqual({
      name: ['MUHAMMAD ZARIF', 'NURHAN'], sub: 'BIN MOHD ARIFIN', role: ['Computer Science', '3D Visualization'],
    });
  });
  it('copes with short names and a one-part role', () => {
    expect(faceLines('Ada Lovelace', 'Engineer')).toEqual({ name: ['ADA LOVELACE'], sub: '', role: ['Engineer'] });
  });
});
