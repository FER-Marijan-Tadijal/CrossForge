export type Cell = {
  isBlack: boolean;
  letter: string;
  hasAcrossClue: boolean;
  hasDownClue: boolean;
  clueNo: number | null;
  horizontalClue: string;
  verticalClue: string;
  isAutofillZone: boolean;
}

export type Clue = {
  number: number;
  row: number;
  col: number;
};

type Line = {
  index: number;
  direction: 'across' | 'down';
  start: [number, number];
  length: number;
  word: string;
  neighbours: { neighbourIndex: number; ownIdx: number; otherIdx: number }[];
};

export function getWordCoordinates(
    grid: Cell[][],
    row: number,
    col: number,
    direction: 'across' | 'down'
    ): Set<string> {

    const coordinates = new Set<string>();
    const height = grid.length;
    const width = grid[0]?.length || 0;
  
    let r = row;
    let c = col;
  
    while (r >= 0 && c >= 0 && !grid[r][c].isBlack) {
      if (direction === 'across') c--;
      else r--;
    }
  
    r = direction === 'down' ? r + 1 : row;
    c = direction === 'across' ? c + 1 : col;
  
    while (r < height && c < width && !grid[r][c].isBlack) {
      coordinates.add(`${r}-${c}`);
      if (direction === 'across') c++;
      else r++;
    }
  
    return coordinates;
}

export function autoMarkClues(
  grid: Cell[][],
  minLength: number = 2
): Cell[][] {
  const height = grid.length;
  const width = grid[0]?.length || 0;

  // Deep copy of grid so we don't mutate original
  const newGrid: Cell[][] = grid.map(row =>
    row.map(cell => ({ ...cell, hasAcrossClue: false, hasDownClue: false }))
  );

  // Scan for across clues
  for (let r = 0; r < height; r++) {
    for (let c = 0; c < width; ) {
      // Skip black squares
      if (newGrid[r][c].isBlack) {
        c++;
        continue;
      }

      const start = c;
      while (c < width && !newGrid[r][c].isBlack) c++;

      const length = c - start;
      if (length >= minLength) {
        newGrid[r][start].hasAcrossClue = true;
      }
    }
  }

  // Scan for down clues
  for (let c = 0; c < width; c++) {
    for (let r = 0; r < height; ) {
      if (newGrid[r][c].isBlack) {
        r++;
        continue;
      }

      const start = r;
      while (r < height && !newGrid[r][c].isBlack) r++;

      const length = r - start;
      if (length >= minLength) {
        newGrid[start][c].hasDownClue = true;
      }
    }
  }

  return newGrid;
}

export function numberGridAndGetClues(grid: Cell[][]): {
  newGrid: Cell[][];
  acrossClues: Clue[];
  downClues: Clue[];
} {
  const height = grid.length;
  const width = grid[0]?.length || 0;
  let number = 1;
  const acrossClues: Clue[] = [];
  const downClues: Clue[] = [];

  const newGrid = grid.map(row => row.map(cell => ({ ...cell, clueNo: null })));

  for (let r = 0; r < height; r++) {
    for (let c = 0; c < width; c++) {
      const cell = newGrid[r][c];

      if (cell.isBlack) continue;

      const startsAcross = cell.hasAcrossClue;
      const startsDown = cell.hasDownClue;

      if (startsAcross || startsDown) {
        (cell as Cell).clueNo = number;

        if (startsAcross) acrossClues.push({ number, row: r, col: c });
        if (startsDown) downClues.push({ number, row: r, col: c });

        number++;
      }
    }
  }

  return { newGrid, acrossClues, downClues };
}


export function getWordFromGrid(
  grid: Cell[][],
  row: number,
  col: number,
  direction: 'across' | 'down'
): string {
  const chars: string[] = [];
  if (direction === 'across') {
    for (let c = col; c < grid[0].length && !grid[row][c].isBlack; c++) {
      chars.push(grid[row][c].letter || '');
    }
  } else if (direction === 'down') {
    for (let r = row; r < grid.length && !grid[r][col].isBlack; r++) {
      chars.push(grid[r][col].letter || '');
    }
  }
  return chars.join('');
}

export function transformGridForPython(grid: Cell[][]): Line[] {
  const lines: Line[] = [];
  const lineMap = new Map<string, number>(); // "r,c,direction" -> lineIndex
  const cellData: {
    across?: { lineIndex: number; idx: number };
    down?: { lineIndex: number; idx: number };
  }[][] = grid.map((row) => row.map(() => ({})));

  const numRows = grid.length;
  const numCols = grid[0].length;
  let lineIndex = 0;

  // Find across lines
  for (let r = 0; r < numRows; r++) {
    let c = 0;
    while (c < numCols) {
      while (c < numCols && grid[r][c].isBlack) c++;
      const start = c;
      while (c < numCols && !grid[r][c].isBlack) c++;
      const length = c - start;

      if (grid[r][start]?.hasAcrossClue) {
        const word = Array(length)
          .fill('')
          .map((_, i) => grid[r][start + i].letter || '_')
          .join('');
        const line: Line = {
          index: lineIndex,
          direction: 'across',
          start: [r, start],
          length,
          word,
          neighbours: [],
        };
        for (let i = 0; i < length; i++) {
          cellData[r][start + i].across = { lineIndex, idx: i };
        }
        lineMap.set(`${r},${start},across`, lineIndex);
        lines.push(line);
        lineIndex++;
      }
    }
  }

  // Find down lines
  for (let c = 0; c < numCols; c++) {
    let r = 0;
    while (r < numRows) {
      while (r < numRows && grid[r][c].isBlack) r++;
      const start = r;
      while (r < numRows && !grid[r][c].isBlack) r++;
      const length = r - start;

      if (grid[start]?.[c]?.hasDownClue) {
        const word = Array(length)
          .fill('')
          .map((_, i) => grid[start + i][c].letter || '_')
          .join('');
        const line: Line = {
          index: lineIndex,
          direction: 'down',
          start: [start, c],
          length,
          word,
          neighbours: [],
        };
        for (let i = 0; i < length; i++) {
          cellData[start + i][c].down = { lineIndex, idx: i };
        }
        lineMap.set(`${start},${c},down`, lineIndex);
        lines.push(line);
        lineIndex++;
      }
    }
  }

  // Set neighbours where across and down cross
  for (let r = 0; r < numRows; r++) {
    for (let c = 0; c < numCols; c++) {
      const data = cellData[r][c];
      if (data.across && data.down) {
        const a = lines[data.across.lineIndex];
        const d = lines[data.down.lineIndex];

        a.neighbours.push({
          neighbourIndex: d.index,
          ownIdx: data.across.idx,
          otherIdx: data.down.idx,
        });

        d.neighbours.push({
          neighbourIndex: a.index,
          ownIdx: data.down.idx,
          otherIdx: data.across.idx,
        });
      }
    }
  }

  return lines;
}

export function applyLinesToGrid(grid: Cell[][], lines: Line[]): void {
  for (const line of lines) {
    const [startRow, startCol] = line.start;
    for (let i = 0; i < line.word.length; i++) {
      const r = line.direction === 'across' ? startRow : startRow + i;
      const c = line.direction === 'across' ? startCol + i : startCol;

      if (grid[r][c].isBlack) {
        console.warn(`Trying to write to black cell at (${r}, ${c})`);
        continue;
      }

      grid[r][c].letter = line.word[i];
    }
  }
}