/**
 * Markdown Export Utilities for Tiptap Notes
 * Converts Tiptap JSON content to clean, formatted Markdown
 */

interface TiptapNode {
  type: string;
  attrs?: Record<string, any>;
  content?: TiptapNode[];
  text?: string;
  marks?: Array<{
    type: string;
    attrs?: Record<string, any>;
  }>;
}

interface Note {
  id: string;
  title: string;
  content: string;
  rich_content?: TiptapNode;
  type: string;
  tags: string[];
  session_id?: string;
  lesson_id?: string;
  module_id?: string;
  timestamp_in_session?: number;
  is_action_item: boolean;
  action_item_completed: boolean;
  action_item_due_date?: string;
  importance: number;
  is_private: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Convert Tiptap JSON to Markdown
 */
export function tiptapToMarkdown(doc: TiptapNode): string {
  if (!doc || !doc.content) {
    return '';
  }

  return doc.content.map(node => nodeToMarkdown(node)).join('\n\n').trim();
}

/**
 * Convert individual Tiptap node to Markdown
 */
function nodeToMarkdown(node: TiptapNode): string {
  switch (node.type) {
    case 'paragraph':
      return processParagraph(node);

    case 'heading':
      return processHeading(node);

    case 'bulletList':
      return processBulletList(node);

    case 'orderedList':
      return processOrderedList(node);

    case 'listItem':
      return processListItem(node);

    case 'taskList':
      return processTaskList(node);

    case 'taskItem':
      return processTaskItem(node);

    case 'blockquote':
      return processBlockquote(node);

    case 'codeBlock':
      return processCodeBlock(node);

    case 'table':
      return processTable(node);

    case 'tableRow':
      return processTableRow(node);

    case 'tableCell':
    case 'tableHeader':
      return processTableCell(node);

    case 'hardBreak':
      return '  \n'; // Two spaces for line break in Markdown

    case 'horizontalRule':
      return '---';

    case 'audioTimestamp':
      return processAudioTimestamp(node);

    case 'text':
      return processText(node);

    default:
      // Fallback: process content if it exists
      if (node.content) {
        return node.content.map(child => nodeToMarkdown(child)).join('');
      }
      return node.text || '';
  }
}

/**
 * Process paragraph node
 */
function processParagraph(node: TiptapNode): string {
  if (!node.content || node.content.length === 0) {
    return '';
  }

  return node.content.map(child => nodeToMarkdown(child)).join('');
}

/**
 * Process heading node
 */
function processHeading(node: TiptapNode): string {
  const level = node.attrs?.level || 1;
  const content = node.content?.map(child => nodeToMarkdown(child)).join('') || '';
  const hashes = '#'.repeat(Math.min(level, 6));

  return `${hashes} ${content}`;
}

/**
 * Process bullet list
 */
function processBulletList(node: TiptapNode): string {
  if (!node.content) return '';

  return node.content
    .map(item => `- ${nodeToMarkdown(item).replace(/^- /, '')}`)
    .join('\n');
}

/**
 * Process ordered list
 */
function processOrderedList(node: TiptapNode): string {
  if (!node.content) return '';

  return node.content
    .map((item, index) => `${index + 1}. ${nodeToMarkdown(item).replace(/^\d+\. /, '')}`)
    .join('\n');
}

/**
 * Process list item
 */
function processListItem(node: TiptapNode): string {
  if (!node.content) return '';

  return node.content
    .map(child => nodeToMarkdown(child))
    .join('\n')
    .split('\n')
    .map((line, index) => index === 0 ? line : `  ${line}`) // Indent continuation lines
    .join('\n');
}

/**
 * Process task list
 */
function processTaskList(node: TiptapNode): string {
  if (!node.content) return '';

  return node.content
    .map(item => nodeToMarkdown(item))
    .join('\n');
}

/**
 * Process task item
 */
function processTaskItem(node: TiptapNode): string {
  const checked = node.attrs?.checked || false;
  const checkbox = checked ? '[x]' : '[ ]';
  const content = node.content?.map(child => nodeToMarkdown(child)).join('') || '';

  return `- ${checkbox} ${content}`;
}

/**
 * Process blockquote
 */
function processBlockquote(node: TiptapNode): string {
  if (!node.content) return '';

  return node.content
    .map(child => nodeToMarkdown(child))
    .join('\n')
    .split('\n')
    .map(line => `> ${line}`)
    .join('\n');
}

/**
 * Process code block
 */
function processCodeBlock(node: TiptapNode): string {
  const language = node.attrs?.language || '';
  const content = node.content?.map(child => nodeToMarkdown(child)).join('') || '';

  return `\`\`\`${language}\n${content}\n\`\`\``;
}

/**
 * Process table
 */
function processTable(node: TiptapNode): string {
  if (!node.content) return '';

  const rows = node.content.map(row => nodeToMarkdown(row));

  // Add header separator if first row contains headers
  if (rows.length > 0) {
    const firstRow = node.content[0];
    const hasHeaders = firstRow?.content?.some(cell => cell.type === 'tableHeader');

    if (hasHeaders) {
      const headerSeparator = '| ' +
        Array(firstRow.content?.length || 0).fill('---').join(' | ') +
        ' |';
      rows.splice(1, 0, headerSeparator);
    }
  }

  return rows.join('\n');
}

/**
 * Process table row
 */
function processTableRow(node: TiptapNode): string {
  if (!node.content) return '';

  const cells = node.content.map(cell => nodeToMarkdown(cell).trim());
  return `| ${cells.join(' | ')} |`;
}

/**
 * Process table cell
 */
function processTableCell(node: TiptapNode): string {
  if (!node.content) return '';

  return node.content
    .map(child => nodeToMarkdown(child))
    .join(' ')
    .replace(/\|/g, '\\|'); // Escape pipes in cell content
}

/**
 * Process audio timestamp
 */
function processAudioTimestamp(node: TiptapNode): string {
  const timestamp = node.attrs?.timestamp || 0;
  const label = node.attrs?.label || formatTimestamp(timestamp);
  const sessionId = node.attrs?.sessionId || '';

  // Create a markdown link-style reference
  return `[🎵 ${label}](audio://timestamp/${timestamp}${sessionId ? `?session=${sessionId}` : ''})`;
}

/**
 * Process text node with marks
 */
function processText(node: TiptapNode): string {
  let text = node.text || '';

  if (node.marks) {
    // Apply marks in reverse order for proper nesting
    const sortedMarks = [...node.marks].reverse();

    for (const mark of sortedMarks) {
      switch (mark.type) {
        case 'bold':
          text = `**${text}**`;
          break;
        case 'italic':
          text = `*${text}*`;
          break;
        case 'underline':
          // Markdown doesn't have native underline, use HTML
          text = `<u>${text}</u>`;
          break;
        case 'strike':
          text = `~~${text}~~`;
          break;
        case 'code':
          text = `\`${text}\``;
          break;
        case 'link':
          const href = mark.attrs?.href || '';
          text = `[${text}](${href})`;
          break;
        case 'highlight':
          const color = mark.attrs?.color || 'yellow';
          text = `<mark style="background-color: ${color}">${text}</mark>`;
          break;
        case 'textStyle':
          // Handle color and other text styles
          if (mark.attrs?.color) {
            text = `<span style="color: ${mark.attrs.color}">${text}</span>`;
          }
          break;
      }
    }
  }

  return text;
}

/**
 * Format timestamp in MM:SS or HH:MM:SS format
 */
function formatTimestamp(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = Math.floor(seconds % 60);

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  } else {
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }
}

/**
 * Export single note to markdown
 */
export function exportNoteToMarkdown(note: Note): string {
  const sections: string[] = [];

  // Title
  sections.push(`# ${note.title}`);

  // Metadata
  const metadata: string[] = [];
  metadata.push(`**Type:** ${note.type.replace('-', ' ')}`);
  metadata.push(`**Created:** ${new Date(note.created_at).toLocaleDateString()}`);
  metadata.push(`**Updated:** ${new Date(note.updated_at).toLocaleDateString()}`);

  if (note.importance > 3) {
    const importanceLabels = ['', 'Very Low', 'Low', 'Medium', 'High', 'Critical'];
    metadata.push(`**Importance:** ${importanceLabels[note.importance]} (${note.importance}/5)`);
  }

  if (note.is_action_item) {
    const status = note.action_item_completed ? 'Completed' : 'Pending';
    metadata.push(`**Action Item:** ${status}`);

    if (note.action_item_due_date) {
      metadata.push(`**Due Date:** ${new Date(note.action_item_due_date).toLocaleDateString()}`);
    }
  }

  if (note.tags && note.tags.length > 0) {
    metadata.push(`**Tags:** ${note.tags.map(tag => `#${tag}`).join(', ')}`);
  }

  if (note.timestamp_in_session) {
    metadata.push(`**Timestamp:** ${formatTimestamp(note.timestamp_in_session)}`);
  }

  sections.push(metadata.join('  \n'));

  // Content
  if (note.rich_content) {
    const markdownContent = tiptapToMarkdown(note.rich_content);
    if (markdownContent) {
      sections.push('## Content');
      sections.push(markdownContent);
    }
  } else if (note.content) {
    sections.push('## Content');
    sections.push(note.content);
  }

  return sections.join('\n\n');
}

/**
 * Export multiple notes to a single markdown document
 */
export function exportNotesToMarkdown(notes: Note[], title: string = 'Notes Export'): string {
  const sections: string[] = [];

  // Document title
  sections.push(`# ${title}`);

  // Export metadata
  sections.push(`*Exported on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}*`);
  sections.push(`*Total notes: ${notes.length}*`);

  // Table of contents
  if (notes.length > 1) {
    sections.push('## Table of Contents');
    const toc = notes.map((note, index) =>
      `${index + 1}. [${note.title}](#${note.title.toLowerCase().replace(/[^a-z0-9]/g, '-')})`
    );
    sections.push(toc.join('\n'));
  }

  // Individual notes
  notes.forEach((note, index) => {
    sections.push('---');

    // Note header
    sections.push(`## ${index + 1}. ${note.title}`);

    // Note metadata
    const metadata: string[] = [];
    metadata.push(`**Type:** ${note.type.replace('-', ' ')}`);
    metadata.push(`**Created:** ${new Date(note.created_at).toLocaleDateString()}`);

    if (note.is_action_item) {
      const status = note.action_item_completed ? '✅ Completed' : '⏳ Pending';
      metadata.push(`**Action Item:** ${status}`);
    }

    if (note.tags && note.tags.length > 0) {
      metadata.push(`**Tags:** ${note.tags.map(tag => `#${tag}`).join(', ')}`);
    }

    sections.push(metadata.join(' • '));

    // Note content
    if (note.rich_content) {
      const markdownContent = tiptapToMarkdown(note.rich_content);
      if (markdownContent) {
        sections.push(markdownContent);
      }
    } else if (note.content) {
      sections.push(note.content);
    }
  });

  return sections.join('\n\n');
}

/**
 * Download markdown content as file
 */
export function downloadMarkdown(content: string, filename: string = 'notes'): void {
  const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}.md`;
  link.style.display = 'none';

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
}

/**
 * Copy markdown content to clipboard
 */
export async function copyMarkdownToClipboard(content: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(content);
    return true;
  } catch (error) {
    console.error('Failed to copy to clipboard:', error);
    return false;
  }
}