'use client';

import { useState, useEffect, useRef } from 'react';
import { getWordCoordinates, autoMarkClues,/*Cell,*/ getWordFromGrid, numberGridAndGetClues} from "@/app/creator/gridfuns"

export type Cell = {
  isBlack: boolean;
  letter: string;
  hasAcrossClue: boolean;
  hasDownClue: boolean;
  clueNo: number | null;
  horizontalClue: string;
  verticalClue: string;
}
/*
Cell:
guessedLetter: string;
isChecked: boolean
*/

export default function CrosswordPage({ initialGrid }: { initialGrid: Cell[][] }) {
  const width = initialGrid[0].length;
  const height = initialGrid.length;
  const [grid, setGrid] = useState<Cell[][]>(initialGrid);
  const [selected, setSelected] = useState<{ row: number; col: number }>({ row: 0, col: 0 });
  const [direction, setDirection] = useState<'across' | 'down'>('across');
  const containerRef = useRef<HTMLDivElement>(null);

  const handleSave = async () => {
    /*Save progress?
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
    }*/
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
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
  }, [selected, width, height, direction]);

  const highlightedCells = getWordCoordinates(grid, selected.row, selected.col, direction);
  const { newGrid, acrossClues, downClues } = numberGridAndGetClues(grid);
  const selCell = grid[selected.row]?.[selected.col];

  return (
    <main className="h-screen flex">
      {/* Left Sidebar */}
      <div className="w-64 bg-gray-100 p-4 border-r overflow-y-auto">
        <h2 className="text-lg font-bold mb-4">Controls</h2>
      
        <button
          onClick={handleSave}
          className="mt-4 w-full py-2 px-4 rounded-md bg-blue-600 text-white hover:bg-blue-700"
        >
          Save Progress
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
  
                    if (isSelected) {
                      setDirection(prev => (prev === 'across' ? 'down' : 'across'));
                    } else {
                      setSelected({ row: rowIndex, col: colIndex });
                    }
                    containerRef.current?.focus();
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