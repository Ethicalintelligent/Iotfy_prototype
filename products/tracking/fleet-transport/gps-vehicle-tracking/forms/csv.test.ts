import { describe, expect, it } from 'vitest';
import { csvLine, csvRecords, parseCsv } from './csv';

describe('parseCsv', () => {
  it('reads quoted cells, doubled quotes and CRLF', () => {
    expect(parseCsv('a,b\r\n"x, y","say ""hi"""\r\n')).toEqual([
      ['a', 'b'],
      ['x, y', 'say "hi"'],
    ]);
  });
  it('reads semicolon files from Excel and drops empty lines and the BOM', () => {
    expect(parseCsv(String.fromCharCode(0xfeff) + 'Plate;Call\n\nKSA 1;Truck 1\n')).toEqual([
      ['Plate', 'Call'],
      ['KSA 1', 'Truck 1'],
    ]);
  });
  it('keeps a last line without a newline and empty cells', () => {
    expect(parseCsv('a,b,c\n1,,3')).toEqual([
      ['a', 'b', 'c'],
      ['1', '', '3'],
    ]);
  });
});

describe('csvRecords', () => {
  it('matches headers without case or spacing and lists unknown and missing ones', () => {
    const r = csvRecords('plate  number,Call Sign,Colour\nKSA 1, Truck 1 ,red', [
      'Plate Number',
      'Call Sign',
      'Group',
    ]);
    expect(r.rows).toEqual([{ 'Plate Number': 'KSA 1', 'Call Sign': 'Truck 1' }]);
    expect(r.unknown).toEqual(['Colour']);
    expect(r.missing).toEqual(['Group']);
  });
});

describe('csvLine', () => {
  it('quotes only when needed', () => {
    expect(csvLine(['a', 'b,c', null, 'say "x"'])).toBe('a,"b,c",,"say ""x"""');
  });
});
