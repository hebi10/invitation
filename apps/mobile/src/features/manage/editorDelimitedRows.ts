export function readEditorRows(value: string, columns: number): string[][] {
  if (!value) return [];
  return value.split('\n').map(line => {
    const parts = line.split('|');
    return Array.from({ length: columns }, (_, index) =>
      index === columns - 1 ? parts.slice(index).join('|') : parts[index] ?? '');
  });
}

export function updateEditorCell(value: string, row: number, column: number, next: string, columns: number) {
  const rows = readEditorRows(value, columns);
  if (!rows[row]) return value;
  const normalized = next.replace(/\r?\n/g, ' ');
  rows[row][column] = columns === 3 || column < columns - 1 ? normalized.replace(/\|/g, ' ') : normalized;
  return rows.map(cells => cells.join('|')).join('\n');
}

export function appendEditorRow(value: string, columns: number, maxRows = 3) {
  const rows = readEditorRows(value, columns);
  if (rows.length >= maxRows) return value;
  rows.push(Array(columns).fill(''));
  return rows.map(cells => cells.join('|')).join('\n');
}

export function removeEditorRow(value: string, row: number) {
  return value.split('\n').filter((_, index) => index !== row).join('\n');
}

export function validateEditorRows(value: string, columns: number): number | null {
  const index = readEditorRows(value, columns).findIndex(cells =>
    cells.some(cell => cell.trim()) && cells.some(cell => !cell.trim()));
  return index === -1 ? null : index + 1;
}
