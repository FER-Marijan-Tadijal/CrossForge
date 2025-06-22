'use client';

import { useState, useEffect, useRef } from 'react';
import { getWordCoordinates, autoMarkClues, Cell, getWordFromGrid, numberGridAndGetClues} from "@/app/creator/gridfuns"

export default function CrosswordPage() {
  const [width, setWidth] = useState(5);
  const [height, setHeight] = useState(5);
  const [pendingWidth, setPendingWidth] = useState(15);
  const [pendingHeight, setPendingHeight] = useState(15);
  const [grid, setGrid] = useState<Cell[][]>(
    Array.from({ length: 5 }, () =>
      Array.from({ length: 5 }, () => ({ isBlack: false, letter: '', hasAcrossClue: false, hasDownClue: false, clueNo: null, horizontalClue: "", verticalClue: "" }))
    )
  );
  const [mode, setMode] = useState<'edit' | 'paint'>('edit');
  const [selected, setSelected] = useState<{ row: number; col: number }>({ row: 0, col: 0 });
  const [direction, setDirection] = useState<'across' | 'down'>('across');
  const [mouseButton, setMouseButton] = useState<number | null>(null);
  const [autofillError, setAutofillError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [loading, setLoading] = useState(false);

  const handleAutofill = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/autofill', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ grid }),
      });

      const data = await res.json();
      if (data?.grid) {
        setGrid(data.grid);
        setAutofillError(null);
      } else {
        console.error('Autofill failed: No grid returned.');
        setAutofillError('Autofill failed. Please try a smaller grid or filling in more of the crossword.');
      }
    } catch (err) {
      console.error('Autofill error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    const res = await fetch('/api/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: 1,
        title: 'Untitled Crossword',
        publish: false,
        grid,
      }),
    });

    const result = await res.json();
    if (result.success) {
      alert('Crossword saved successfully!');
    } else {
      alert('Failed to save crossword');
    }
  };

  const applyAutoClueMarking = () => {
    const updatedGrid = autoMarkClues(grid); // Default minLength = 2
    setGrid(updatedGrid);
  };

  function setAcrossClueAtSelected() {
    setGrid(prev => {
      const newGrid = prev.map(row => row.map(cell => ({ ...cell })));
      const { row, col } = selected;
  
      if (!newGrid[row][col].isBlack) {
        newGrid[row][col].hasAcrossClue = !newGrid[row][col].hasAcrossClue;
      }
  
      return newGrid;
    });
  }
  function setDownClueAtSelected() {
    setGrid(prev => {
      const newGrid = prev.map(row => row.map(cell => ({ ...cell })));
      const { row, col } = selected;
  
      if (!newGrid[row][col].isBlack) {
        newGrid[row][col].hasDownClue = !newGrid[row][col].hasDownClue;
      }
  
      return newGrid;
    });
  }

  const [symmetryRotational, setSymmetryRotational] = useState(true);
  const [symmetryMirror, setSymmetryMirror] = useState(false);
  const [symmetryDiagonal, setSymmetryDiagonal] = useState(false);

  function getSymmetricCells(row: number, col: number): [number, number][] {
    const coords = new Set<string>();
  
    const add = (r: number, c: number) => {
      if (r >= 0 && r < height && c >= 0 && c < width) {
        coords.add(`${r},${c}`);
      }
    };
  
    if (symmetryRotational) {
      add(height - 1 - row, width - 1 - col);
    }
    if (symmetryMirror) {
      add(row, width - 1 - col);
    }
    if (symmetryDiagonal && width === height) {
      add(col, row); // valid only for square grids
    }
  
    return Array.from(coords).map(pair => pair.split(',').map(Number) as [number, number]);
  }

  function applyBlackChangeWithSymmetry(row: number, col: number, newValue: boolean) {
    setGrid(prev => {
      const newGrid = prev.map(r => [...r]);
      
      const update = (r: number, c: number) => {
        const cell = newGrid[r][c];
        if (cell.isBlack !== newValue) {
          cell.isBlack = newValue;
          if (newValue) cell.letter = '';
        }
      };
  
      update(row, col);
      for (const [r, c] of getSymmetricCells(row, col)) {
        update(r, c);
      }
  
      return newGrid;
    });
  }


  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (mode !== 'edit') return;
      const { row, col } = selected;
      let newRow = row;
      let newCol = col;

      if (e.key === 'Shift') {
        setDirection(prev => (prev === 'across' ? 'down' : 'across'));
        return;
      }

      if (e.key === 'ArrowUp') newRow = Math.max(0, row - 1);
      else if (e.key === 'ArrowDown') newRow = Math.min(height - 1, row + 1);
      else if (e.key === 'ArrowLeft') newCol = Math.max(0, col - 1);
      else if (e.key === 'ArrowRight') newCol = Math.min(width - 1, col + 1);
      else if (e.key === ' ' || e.key === 'Spacebar') {
        if (direction === 'across' && col < width - 1) newCol = col + 1;
        else if (direction === 'down' && row < height - 1) newRow = row + 1;
      } else if (e.key === 'Backspace') {
        setGrid(prev => {
          const newGrid = prev.map(r => [...r]);
          newGrid[row][col].letter = '';
          return newGrid;
        });
        if (direction === 'across' && col > 0) newCol = col - 1;
        else if (direction === 'down' && row > 0) newRow = row - 1;
        setSelected({ row: newRow, col: newCol });
        return;
      } else if (e.key === 'Delete') {
        setGrid(prev => {
          const newGrid = prev.map(r => [...r]);
          newGrid[row][col].letter = '';
          return newGrid;
        });
      } else if (/^[a-zA-Z]$/.test(e.key)) {
        setGrid(prev => {
          const newGrid = prev.map(r => [...r]);
          newGrid[row][col].letter = e.key.toUpperCase();
          return newGrid;
        });
        if (direction === 'across' && col < width - 1) newCol = col + 1;
        else if (direction === 'down' && row < height - 1) newRow = row + 1;
      }

      setSelected({ row: newRow, col: newCol });
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selected, width, height, mode, direction]);

  const applyDimensions = () => {
    const newWidth = Math.max(1, Math.min(50, pendingWidth));
    const newHeight = Math.max(1, Math.min(50, pendingHeight));

    setGrid(prev =>
      Array.from({ length: newHeight }, (_, row) =>
        Array.from({ length: newWidth }, (_, col) => prev[row]?.[col] ?? { isBlack: false, letter: '' })
      )
    );

    setWidth(newWidth);
    setHeight(newHeight);
    setSelected({ row: 0, col: 0 });
  };

  const highlightedCells = getWordCoordinates(grid, selected.row, selected.col, direction);
  const { newGrid, acrossClues, downClues } = numberGridAndGetClues(grid);
  const selCell = grid[selected.row]?.[selected.col];
  const hasAcross = selCell?.hasAcrossClue;
  const hasDown   = selCell?.hasDownClue;

  return (
    <main className="h-screen flex">
      {/* Left Sidebar */}
      <div className="w-64 bg-gray-100 p-4 border-r overflow-y-auto">
        <h2 className="text-lg font-bold mb-4">Controls</h2>
  
        {/* Resize Controls */}
        <div className="mb-4">
          <label className="block mb-2">
            Width:
            <input
              type="number"
              value={pendingWidth}
              min={1}
              max={50}
              onChange={e => setPendingWidth(parseInt(e.target.value))}
              className="ml-2 w-16 border px-1 py-0.5 rounded"
            />
          </label>
          <label className="block mb-2">
            Height:
            <input
              type="number"
              value={pendingHeight}
              min={1}
              max={50}
              onChange={e => setPendingHeight(parseInt(e.target.value))}
              className="ml-2 w-16 border px-1 py-0.5 rounded"
            />
          </label>
          <button
            onClick={applyDimensions}
            className="mt-2 px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Accept
          </button>
        </div>
  
        {/* Mode Selector */}
        <div className="mb-4">
          <h3 className="font-semibold mb-2">Mode</h3>
          <button
            onClick={() => setMode('edit')}
            disabled={mode === 'edit'}
            className={`block w-full mb-2 px-3 py-1 rounded ${mode === 'edit' ? 'bg-gray-300' : 'bg-blue-500 text-white hover:bg-blue-600'}`}
          >
            Edit Mode
          </button>
          <button
            onClick={() => setMode('paint')}
            disabled={mode === 'paint'}
            className={`block w-full px-3 py-1 rounded ${mode === 'paint' ? 'bg-gray-300' : 'bg-blue-500 text-white hover:bg-blue-600'}`}
          >
            Paint Mode
          </button>
        </div>

        <div className="mb-4">
          <button
            onClick={applyAutoClueMarking}
            className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 w-full"
          >
            Auto Mark Clues
          </button>
        </div>

        {/* Set Across Clue */}
        <button
          onClick={setAcrossClueAtSelected}
          disabled={selCell?.isBlack}
          className={`
            block w-full mb-2 px-3 py-1 rounded
            ${!hasAcross
              ? 'bg-green-600 text-white hover:bg-green-700'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}
          `}
        >
          {hasAcross ? 'Clear Across Clue' : 'Set Across Clue'}
        </button>
        {/* Set Down Clue */}
        <button
          onClick={setDownClueAtSelected}
          disabled={selCell?.isBlack}
          className={`
            block w-full px-3 py-1 rounded
            ${!hasDown
              ? 'bg-blue-600 text-white hover:bg-blue-700'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}
          `}
        >
          {hasDown ? 'Clear Down Clue' : 'Set Down Clue'}
        </button>
  
        {/* Symmetry Toggles */}
        <div className="mb-4">
          <h3 className="font-semibold mb-2">Symmetry</h3>
          <label className="block">
            <input
              type="checkbox"
              checked={symmetryRotational}
              onChange={e => setSymmetryRotational(e.target.checked)}
              className="mr-2"
            />
            Rotational
          </label>
          <label className="block">
            <input
              type="checkbox"
              checked={symmetryMirror}
              onChange={e => setSymmetryMirror(e.target.checked)}
              className="mr-2"
            />
            Mirror
          </label>
          <label className="block">
            <input
              type="checkbox"
              checked={symmetryDiagonal}
              onChange={e => setSymmetryDiagonal(e.target.checked)}
              className="mr-2"
            />
            Diagonal
          </label>
        </div>

        <button
          onClick={handleAutofill}
          disabled={loading}
          className={`mt-4 w-full py-2 px-4 rounded-md text-white ${
            loading ? 'bg-gray-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700'
          }`}
        >
          {loading ? 'Autofilling...' : 'Autofill'}
        </button>
        {autofillError && (
          <p className="text-sm text-red-500 mt-2">{autofillError}</p>
        )}

        <button
          onClick={handleSave}
          className="mt-4 w-full py-2 px-4 rounded-md bg-blue-600 text-white hover:bg-blue-700"
        >
          Save Crossword
        </button>
      </div>
  
      {/* Center Grid Area */}
      <div className="flex-1 flex justify-center items-center overflow-auto bg-white">
        <div
          ref={containerRef}
          tabIndex={0}
          className="outline-none grid gap-px bg-black w-fit"
          style={{
            gridTemplateColumns: `repeat(${width}, 1fr)`,
            gridTemplateRows: `repeat(${height}, 1fr)`,
            aspectRatio: `${width} / ${height}`,
            width: '100%',
            maxWidth: 'min(90vh, 90vw)',          }}
          onClick={() => containerRef.current?.focus()}
          onMouseUp={() => setMouseButton(null)}
          onMouseLeave={() => setMouseButton(null)}
        >
          {newGrid.slice(0, height).map((row, rowIndex) =>
            row.slice(0, width).map((cell, colIndex) => {
              const isSelected = selected.row === rowIndex && selected.col === colIndex;
              const key = `${rowIndex}-${colIndex}`;
              const isHighlighted = highlightedCells.has(key);
  
              const bg = cell.isBlack
                ? 'bg-black'
                : isSelected
                ? direction === 'across' ? 'bg-cyan-100' : 'bg-orange-100'
                : isHighlighted
                ? 'bg-gray-100'
                : 'bg-white';
  
              const border = isSelected
                ? 'border-2 border-teal-700'
                : isHighlighted
                ? 'border-2 border-gray-300'
                : 'border border-gray-300';
  
              return (
                <div
                  key={key}
                  onMouseDown={e => {
                    e.preventDefault();
                    e.stopPropagation();
  
                    if (mode === 'paint') {
                      const isRightClick = e.button === 2;
                      const newValue = !isRightClick;
  
                      setMouseButton(e.button);
                      applyBlackChangeWithSymmetry(rowIndex, colIndex, newValue);
                    } else {
                      if (isSelected) {
                        setDirection(prev => (prev === 'across' ? 'down' : 'across'));
                      } else {
                        setSelected({ row: rowIndex, col: colIndex });
                      }
                      containerRef.current?.focus();
                    }
                  }}
                  onMouseEnter={e => {
                    if (mode === 'paint' && mouseButton !== null) {
                      const isRightClick = mouseButton === 2;
                      const newValue = !isRightClick;
                      applyBlackChangeWithSymmetry(rowIndex, colIndex, newValue);
                    }
                  }}
                  onContextMenu={e => e.preventDefault()}
                  className={`w-full h-full ${bg} ${border} flex items-center justify-center font-bold text-[16px] cursor-pointer font-mono select-none box-border relative`}
                >
                  {/* Clue number in top-left */}
                  {cell.clueNo != null && (
                    <div className="absolute top-[-2px] left-[2px] text-[9px] text-gray-700">
                      {cell.clueNo}
                    </div>
                  )}
                  
                  {/* Main letter centered */}
                  <div className="flex items-center justify-center h-full text-[min(5vw,5vh)] font-bold leading-none">
                    {!cell.isBlack ? cell.letter : ''}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
  
      {/* Clues Sidebar */}
      <div className="w-80 bg-white border-l border-gray-200 p-4 overflow-y-auto h-screen">
        <h2 className="text-xl font-bold mb-4">Clues</h2>

        <div className="mb-8">
          <h3 className="text-lg font-semibold text-gray-700 mb-2 border-b pb-1">Across</h3>
          <ul className="space-y-3">
            {acrossClues.map(clue => {
              const cell = grid[clue.row][clue.col];
              const word = getWordFromGrid(grid, clue.row, clue.col, 'across');

              return (
                <li key={`across-${clue.number}`}>
                  <label className="text-sm font-medium text-gray-600 block mb-1">
                    {clue.number}. {word.toUpperCase()}
                  </label>
                  <input
                    type="text"
                    onFocus={() => {
                      setSelected({ row: clue.row, col: clue.col });
                      setDirection("across")
                    }}
                    onKeyDown={e => e.stopPropagation()}
                    value={cell.horizontalClue}
                    onChange={e => {
                      const newText = e.target.value;
                      setGrid(prev => {
                        const newGrid = prev.map(row => row.map(cell => ({ ...cell })));
                        newGrid[clue.row][clue.col].horizontalClue = newText;
                        return newGrid;
                      });
                    }}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter across clue"
                  />
                </li>
              );
            })}
          </ul>
        </div>

        <div>
          <h3 className="text-lg font-semibold text-gray-700 mb-2 border-b pb-1">Down</h3>
          <ul className="space-y-3">
            {downClues.map(clue => {
              const cell = grid[clue.row][clue.col];
              const word = getWordFromGrid(grid, clue.row, clue.col, 'down');

              return (
                <li key={`down-${clue.number}`}>
                  <label className="text-sm font-medium text-gray-600 block mb-1">
                    {clue.number}. {word.toUpperCase()}
                  </label>
                  <input
                    type="text"
                    onFocus={() => {
                        setSelected({ row: clue.row, col: clue.col });
                        setDirection("down")
                    }}
                    onKeyDown={e => e.stopPropagation()}
                    value={cell.verticalClue}
                    onChange={e => {
                      const newText = e.target.value;
                      setGrid(prev => {
                        const newGrid = prev.map(row => row.map(cell => ({ ...cell })));
                        newGrid[clue.row][clue.col].verticalClue = newText;
                        return newGrid;
                      });
                    }}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter down clue"
                  />
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </main>
  );
}