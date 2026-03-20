/**
 * Convert Markdown to plain text
 * Remove formatting symbols, keep readable content
 */
export function markdownToPlainText(markdown: string): string {
  if (!markdown) return '';

  return markdown
    // Remove code blocks (keep content)
    .replace(/```[\s\S]*?```/g, (match) => {
      return match.replace(/```.*\n?/g, '');
    })
    // Remove inline code
    .replace(/`([^`]+)`/g, '$1')
    // Remove images
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1')
    // Remove links, keep text
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    // Remove bold
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/__([^_]+)__/g, '$1')
    // Remove italic
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/_([^_]+)_/g, '$1')
    // Remove heading symbols
    .replace(/^#{1,6}\s+/gm, '')
    // Remove unordered list symbols
    .replace(/^[\s]*[-*+]\s+/gm, '')
    // Remove ordered list symbols
    .replace(/^\s*\d+\.\s+/gm, '')
    // Remove blockquote symbols
    .replace(/^>\s*/gm, '')
    // Remove horizontal rules
    .replace(/^[-*_]{3,}\s*$/gm, '')
    // Remove Markdown table separator lines (lines with only |, -, :, spaces)
    .replace(/^\|[\s|:-]+\|$/gm, '')
    .replace(/^[\s|:-]+$/gm, '')
    // Remove Markdown table format
    .replace(/^\|.*\|$/gm, (match) => {
      // Remove leading/trailing |, separate cell content with spaces
      return match
        .replace(/^\||\|$/g, '')        // Remove leading/trailing |
        .replace(/\s*\|\s*/g, ' | ')    // Normalize inner separators
        .trim();
    })
    // Remove HTML tags
    .replace(/<[^>]+>/g, '')
    // Clean up excessive blank lines
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
