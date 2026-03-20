import { describe, expect, it } from 'vitest';
import { markdownToPlainText } from '../markdown';

describe('markdownToPlainText', () => {
  it('removes markdown syntax from links, images, and headings', () => {
    expect(
      markdownToPlainText('![logo](https://example.com/logo.png)\n[OpenAI](https://openai.com)\n# Title')
    ).toBe('logo\nOpenAI\nTitle');
  });

  it('removes common formatting markers while keeping readable content', () => {
    expect(
      markdownToPlainText('**Bold**\n> Quote\n1. Ordered item\n- Bullet item\n`inline code`')
    ).toBe('Bold\nQuote\nOrdered item\nBullet item\ninline code');
  });
});
