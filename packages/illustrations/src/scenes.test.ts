import { describe, expect, it } from 'vitest';
import { SCENE_NAMES, sceneMarkup } from './scenes.js';

describe('sign-in scenes', () => {
  it('has every legacy scene', () => {
    expect([...SCENE_NAMES].sort()).toEqual(
      [
        'asset',
        'atm',
        'atmtrack',
        'construct',
        'dashcam',
        'datacenter',
        'dg',
        'dispenser',
        'fleet',
        'health',
        'indoorasset',
        'indoorpeople',
        'mobicop',
        'rfid',
        'schoolbus',
        'tank',
        'telecom',
        'vehicle',
        'video',
        'waste',
        'workforce',
      ].sort(),
    );
  });

  it.each(SCENE_NAMES)('%s: one labelled SVG with no gaps', (name) => {
    const svg = sceneMarkup(name);
    expect(svg.startsWith('<svg')).toBe(true);
    expect(svg.match(/<svg/g)).toHaveLength(1);
    expect(svg).toMatch(/role="img" aria-label="[^"]{10,}"/);
    expect(svg).not.toMatch(/undefined|NaN/);
  });

  it('ATM tracking and ATM monitoring differ; unknown names draw nothing', () => {
    expect(sceneMarkup('atmtrack')).not.toBe(sceneMarkup('atm'));
    expect(sceneMarkup('nope')).toBe('');
  });
});
