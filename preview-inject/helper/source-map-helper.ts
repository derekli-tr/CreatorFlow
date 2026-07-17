/**
 * Source Map Helper Functions
 * Utility functions for JSX element extraction and source map processing
 */

/**
 * Opening tag information
 */
export type OpenTagInfo = {
  tagName: string;
  lineIndex: number;
  columnStart: number;
  columnEnd: number;
  isSelfClosing: boolean;
  closeLineIndex: number;
  closeColumnEnd: number;
};

/**
 * Check if source map position points to the previous element's ending line
 * Source map often points to the line where previous sibling ends,
 * so we need to find the next opening tag below
 */
export function correctSourceMapPosition(
  lines: string[],
  targetIndex: number,
  targetColumn?: number
): { lineIndex: number; column?: number } {
  const line = lines[targetIndex];
  if (!line) return { lineIndex: targetIndex, column: targetColumn };

  const trimmedLine = line.trim();

  // Case 1: Line is only a closing tag (e.g., "</div>")
  const isOnlyClosingTag = /^<\/[A-Za-z][A-Za-z0-9\-_.]*\s*>$/.test(
    trimmedLine
  );

  // Case 2: Line ends with a closing tag (e.g., "<h1>text</h1>" or "text</div>")
  const endsWithClosingTag = /<\/[A-Za-z][A-Za-z0-9\-_.]*\s*>$/.test(
    trimmedLine
  );

  // Case 3: Check if targetColumn is at or after a closing tag
  let isAfterClosingTag = false;
  if (targetColumn != null) {
    const beforeTarget = line.substring(0, targetColumn);
    isAfterClosingTag = /<\/[A-Za-z][A-Za-z0-9\-_.]*\s*>$/.test(beforeTarget);
  }

  // If any of these cases, search for the next opening tag below
  if (isOnlyClosingTag || endsWithClosingTag || isAfterClosingTag) {
    // First check if there's an opening tag after targetColumn on the same line
    if (targetColumn != null) {
      const afterTarget = line.substring(targetColumn);
      const nextOpenMatch = afterTarget.match(/<([A-Za-z][A-Za-z0-9\-_.]*)/);
      if (nextOpenMatch && afterTarget[nextOpenMatch.index! + 1] !== "/") {
        return {
          lineIndex: targetIndex,
          column: targetColumn + nextOpenMatch.index! + 1,
        };
      }
    }

    // Search next lines (up to 50 lines)
    for (
      let i = targetIndex + 1;
      i < lines.length && i < targetIndex + 50;
      i++
    ) {
      const nextLine = lines[i];
      const openTagMatch = nextLine.match(/<([A-Za-z][A-Za-z0-9\-_.]*)/);
      if (openTagMatch && nextLine[openTagMatch.index! + 1] !== "/") {
        // Found an opening tag on this line
        return { lineIndex: i, column: openTagMatch.index! + 1 };
      }
    }
  }

  return { lineIndex: targetIndex, column: targetColumn };
}

/**
 * Find the end of a tag (handles multi-line and JSX expressions)
 */
export function findTagEnd(
  lines: string[],
  startLineIndex: number,
  startColumn: number
):
  | { lineIndex: number; columnEnd: number; isSelfClosing: boolean }
  | undefined {
  let depth = 0;

  for (let i = startLineIndex; i < lines.length; i++) {
    const line = lines[i];
    const startCol = i === startLineIndex ? startColumn : 0;

    for (let j = startCol; j < line.length; j++) {
      const char = line[j];
      if (char === "{") depth++;
      else if (char === "}") depth--;
      else if (depth === 0) {
        if (char === "/" && line[j + 1] === ">") {
          return { lineIndex: i, columnEnd: j + 2, isSelfClosing: true };
        } else if (char === ">") {
          return { lineIndex: i, columnEnd: j + 1, isSelfClosing: false };
        }
      }
    }
  }

  return undefined;
}

/**
 * Find the closing tag for a given opening tag
 */
export function findClosingTag(
  lines: string[],
  tagName: string,
  startLineIndex: number,
  startColumn: number
): { lineIndex: number; columnEnd: number } | undefined {
  let depth = 1;
  const openPattern = new RegExp(`<${tagName}(?=\\s|>|/>)`, "g");
  const closePattern = new RegExp(`</${tagName}\\s*>`, "g");

  for (let i = startLineIndex; i < lines.length; i++) {
    const searchStart = i === startLineIndex ? startColumn : 0;
    const searchLine = lines[i].substring(searchStart);

    // Collect all tag positions
    const tokens: Array<{
      type: "open" | "close";
      index: number;
      length: number;
    }> = [];

    let match;
    openPattern.lastIndex = 0;
    while ((match = openPattern.exec(searchLine)) !== null) {
      // Check if self-closing by finding tag end
      const tagEnd = findTagEnd([searchLine], 0, match.index + match[0].length);
      if (tagEnd && !tagEnd.isSelfClosing) {
        tokens.push({
          type: "open",
          index: match.index,
          length: match[0].length,
        });
      }
    }

    closePattern.lastIndex = 0;
    while ((match = closePattern.exec(searchLine)) !== null) {
      tokens.push({
        type: "close",
        index: match.index,
        length: match[0].length,
      });
    }

    tokens.sort((a, b) => a.index - b.index);

    for (const token of tokens) {
      if (token.type === "open") depth++;
      else if (token.type === "close") {
        depth--;
        if (depth === 0) {
          return {
            lineIndex: i,
            columnEnd: searchStart + token.index + token.length,
          };
        }
      }
    }
  }

  return undefined;
}

/**
 * Find the innermost opening tag that contains the target position
 * This ensures we get the specific element, not a parent container
 */
export function findOpeningTag(
  lines: string[],
  targetLineIndex: number,
  targetColumn?: number
): OpenTagInfo | undefined {
  let bestMatch: OpenTagInfo | undefined;

  for (let i = targetLineIndex; i >= 0; i--) {
    const line = lines[i];
    const tagRegex = /<([A-Za-z][A-Za-z0-9\-_.]*)/g;
    let match;

    while ((match = tagRegex.exec(line)) !== null) {
      const tagStart = match.index;
      const tagName = match[1];

      // Skip closing tags
      if (line[tagStart + 1] === "/") continue;

      // Check if target is after this tag start
      const isAfterTagStart =
        i < targetLineIndex ||
        (i === targetLineIndex && tagStart <= (targetColumn ?? line.length));

      if (!isAfterTagStart) continue;

      // Find tag end position
      const afterTagName = tagStart + match[0].length;
      const tagEndInfo = findTagEnd(lines, i, afterTagName);
      if (!tagEndInfo) continue;

      let closeLineIndex = i;
      let closeColumnEnd = tagEndInfo.columnEnd;

      // If not self-closing, find the closing tag
      if (!tagEndInfo.isSelfClosing) {
        const closeTagInfo = findClosingTag(
          lines,
          tagName,
          i,
          tagEndInfo.columnEnd
        );
        if (!closeTagInfo) continue;
        closeLineIndex = closeTagInfo.lineIndex;
        closeColumnEnd = closeTagInfo.columnEnd;
      }

      // Check if target is within this element's range
      const isTargetWithin =
        (i < targetLineIndex ||
          (i === targetLineIndex &&
            tagStart <= (targetColumn ?? line.length))) &&
        (closeLineIndex > targetLineIndex ||
          (closeLineIndex === targetLineIndex &&
            closeColumnEnd >= (targetColumn ?? 0)));

      if (!isTargetWithin) continue;

      // Choose the innermost (smallest) element that contains the target
      if (
        !bestMatch ||
        closeLineIndex - i < bestMatch.closeLineIndex - bestMatch.lineIndex ||
        (closeLineIndex - i ===
          bestMatch.closeLineIndex - bestMatch.lineIndex &&
          closeColumnEnd - tagStart <
            bestMatch.closeColumnEnd - bestMatch.columnStart)
      ) {
        bestMatch = {
          tagName,
          lineIndex: i,
          columnStart: tagStart,
          columnEnd: tagEndInfo.columnEnd,
          isSelfClosing: tagEndInfo.isSelfClosing,
          closeLineIndex,
          closeColumnEnd,
        };
      }
    }
  }

  return bestMatch;
}

/**
 * Find the next tag matching the expected tag name below the current position
 * Used when source map position points to the wrong element
 */
export function findNextMatchingTag(
  lines: string[],
  startLineIndex: number,
  expectedTagName: string
): OpenTagInfo | undefined {
  const tagPattern = new RegExp(`<(${expectedTagName})(?=\\s|>|/>)`, "i");

  // Search up to 50 lines below
  for (
    let i = startLineIndex + 1;
    i < lines.length && i < startLineIndex + 50;
    i++
  ) {
    const line = lines[i];
    const match = tagPattern.exec(line);

    if (match) {
      const tagStart = match.index;
      const tagName = match[1];

      // Find tag end position
      const afterTagName = tagStart + match[0].length;
      const tagEndInfo = findTagEnd(lines, i, afterTagName);
      if (!tagEndInfo) continue;

      let closeLineIndex = i;
      let closeColumnEnd = tagEndInfo.columnEnd;

      // If not self-closing, find the closing tag
      if (!tagEndInfo.isSelfClosing) {
        const closeTagInfo = findClosingTag(
          lines,
          tagName,
          i,
          tagEndInfo.columnEnd
        );
        if (!closeTagInfo) continue;
        closeLineIndex = closeTagInfo.lineIndex;
        closeColumnEnd = closeTagInfo.columnEnd;
      }

      return {
        tagName,
        lineIndex: i,
        columnStart: tagStart,
        columnEnd: tagEndInfo.columnEnd,
        isSelfClosing: tagEndInfo.isSelfClosing,
        closeLineIndex,
        closeColumnEnd,
      };
    }
  }

  return undefined;
}

/**
 * Extract code from a range spanning multiple lines
 */
export function extractRange(
  lines: string[],
  startLine: number,
  startCol: number,
  endLine: number,
  endCol: number
): string {
  if (startLine === endLine) {
    return lines[startLine].substring(startCol, endCol);
  }
  let result = lines[startLine].substring(startCol);
  for (let i = startLine + 1; i < endLine; i++) {
    result += "\n" + lines[i];
  }
  result += "\n" + lines[endLine].substring(0, endCol);
  return result;
}

/**
 * Extract source code context (N lines before and after error line)
 * @param sourceContent Source file content
 * @param errorLine Error line number (1-based)
 * @param contextLines Number of context lines
 * @returns Formatted context string
 */
export function extractSourceContext(
  sourceContent: string,
  errorLine: number,
  contextLines: number = 10
): string {
  const lines = sourceContent.split("\n");
  const startLine = Math.max(0, errorLine - contextLines - 1); // Convert to 0-based index
  const endLine = Math.min(lines.length - 1, errorLine + contextLines - 1);

  const contextArray: string[] = [];

  for (let i = startLine; i <= endLine; i++) {
    const lineNumber = i + 1; // Display 1-based line number
    const isErrorLine = lineNumber === errorLine;
    const prefix = isErrorLine ? ">>>" : "   ";
    const formattedLine = `${prefix} ${lineNumber
      .toString()
      .padStart(4, " ")} | ${lines[i] || ""}`;
    contextArray.push(formattedLine);
  }

  return contextArray.join("\n");
}

/**
 * Load source map file
 * @param url source map URL
 * @returns source map content
 */
export async function loadSourceMap(url: string): Promise<any> {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to load source map: ${response.status}`);
    }
    return await response.json();
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.warn("Error loading source map from", url, errorMessage);
  }
}

