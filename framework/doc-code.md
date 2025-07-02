# Prompt: Update code-related documentation (`.md` files describing code)

## Goal:
Keep all documentation about code, APIs, classes, and functions consistent and up-to-date.

## Workflow:
1. Analyze the codebase for all public and internal functions, classes, methods, and APIs.
2. Summarize their purpose, parameters, return values, and usage.
3. Check all `.md` files related to code documentation for missing or outdated info.
4. Update or create `.md` files with clear, concise descriptions.
5. Follow these style rules:
   - Use imperative, short sentences.
   - Separate paragraphs clearly.
   - Use `code blocks` with usage examples.
   - Maintain consistent naming conventions as in code.
   - Avoid redundant or speculative text.
6. Ensure the documentation matches the current code behavior and interface.

---

## Style Guide:
- Markdown standards (headings, bold, code blocks).
- Write for developers and maintainers.
- No TODOs or guesses in final docs.

---

## Example prompt for Cursor:

> Analyze the codebase and extract all public APIs and functions.  
> Review all `.md` files about code documentation for accuracy and completeness.  
> Update them clearly and precisely according to the current code.  
> Use the style guide above.
