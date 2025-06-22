'use client';

import { useState, useEffect, useRef } from 'react';
import { getWordCoordinates, autoMarkClues, Cell, getWordFromGrid, numberGridAndGetClues} from "@/app/creator/gridfuns"
import OptionsModal from '@/app/creator/components/Options';

const digraphMap: Record<string, string> = {
  'LJ': 'Ǉ',
  'NJ': 'Ǌ',
  'DŽ': 'Ǆ',
};

function useUnsavedChangesPrompt(shouldPrompt: boolean) {
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!shouldPrompt) return;
      e.preventDefault();
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [shouldPrompt]);
}

export default function CrosswordPage({ id, initialGrid, initialBlacklist }: { id: Number, initialGrid: Cell[][], initialBlacklist: string }) {
  const [grid, setGrid] = useState<Cell[][]>(initialGrid);
  const [width, setWidth] = useState(initialGrid[0].length);
  const [height, setHeight] = useState(initialGrid.length);
  const [pendingWidth, setPendingWidth] = useState(width);
  const [pendingHeight, setPendingHeight] = useState(height);
  const [minQuality, setMinQuality] = useState<number>(40); // default within 0-50
  const [blacklist, setBlacklist] = useState<string>(initialBlacklist); // space-separated string
  const [mode, setMode] = useState<'edit' | 'paint' | 'zone'>('edit');
  const [selected, setSelected] = useState<{ row: number; col: number }>({ row: 0, col: 0 });
  const [direction, setDirection] = useState<'across' | 'down'>('across');
  const [mouseButton, setMouseButton] = useState<number | null>(null);
  const [autofillError, setAutofillError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [language, setLanguage] = useState<'en' | 'hr'>('en');
  const [showOptions, setShowOptions] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [secretBlacklist, setSecretBlacklist] = useState<string>("");

  useUnsavedChangesPrompt(hasUnsavedChanges);

  const [loading, setLoading] = useState(false);

   const clearGridLetters = () => {
    setGrid(prev =>
      prev.map(row =>
        row.map(cell => ({
          ...cell,
          letter: '',
        }))
      )
    );
  };

  async function handleNextFill() {
    const seen = new Set<string>();
    const words: string[] = [];

    const directions: ('across' | 'down')[] = ['across', 'down'];

    let result = ""

    for (let r = 0; r < grid.length; r++) {
      if (result) break;

      for (let c = 0; c < grid[0].length; c++) {
        if (grid[r][c].isBlack) continue;
        if (!grid[r][c].isAutofillZone) continue;
        if (result) break;

        for (const direction of directions) {
          const coords = getWordCoordinates(grid, r, c, direction);
          const key = [...coords].sort().join(',');

          if (coords.size < 2 || seen.has(key)) continue;
          seen.add(key);

          const isComplete = [...coords].every(coord => {
            const [rr, cc] = coord.split('-').map(Number);
            return !!grid[rr][cc].letter;
          });

          if (isComplete) {
            const word = [...coords].map(coord => {
              const [rr, cc] = coord.split('-').map(Number);
              return grid[rr][cc].letter;
            }).join('').toUpperCase();

            result = word
            break
          }
        }
      }
    }

    const localSecretBlacklist = secretBlacklist + " " + result;

    handleAutofill(localSecretBlacklist)
  }

  const handleAutofill = async (localSecretBlacklist: string) => {
    setLoading(true);
    setHasUnsavedChanges(true)
    try {
      const blacklistArray = blacklist
      .split(' ')
      .map(word => word.trim())
      .filter(word => word); // remove empty strings

      if (localSecretBlacklist) {
          const secretArray = localSecretBlacklist
            .split(' ')
            .map(w => w.trim())
            .filter(w => w);
          blacklistArray.push(...secretArray);
          setSecretBlacklist(localSecretBlacklist)
        } else {
          setSecretBlacklist("");
        }

      const hasAutofillZone = grid.some(row => row.some(cell => cell.isAutofillZone));
      const hasClues = grid.some(row => row.some(cell => cell.hasAcrossClue ||cell.hasDownClue));

      if (!hasClues) {
        setAutofillError("Please mark clues!");
        return;
      }

      const gridToSend = grid.map(row =>
        row.map(cell => {
          if (cell.isBlack) return { ...cell };
          const inZone = hasAutofillZone ? cell.isAutofillZone : true;
          return {
            ...cell,
            letter: inZone ? '' : cell.letter,
          };
        })
      );

      const res = await fetch('/api/autofill', {
        method: 'POST',
        body: JSON.stringify({
          grid: gridToSend,
          minQuality: minQuality,
          blacklist: blacklistArray,
          language: language,
        }),
      });

      const data = await res.json();
      if (data?.grid) {
        setGrid(data.grid);
        setAutofillError(null);
      } else {
        console.error('Autofill failed: No grid returned.');
        setAutofillError(data.details);
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
        id: id,
        title: 'Untitled Crossword',
        publish: false,
        grid,
        blacklist,
      }),
    });

    const result = await res.json();
    if (result.success) {
      alert('Crossword saved successfully!');
      setHasUnsavedChanges(false)
    } else {
      alert('Failed to save crossword');
    }
  };

  const applyAutoClueMarking = () => {
    const updatedGrid = autoMarkClues(grid); // Default minLength = 2
    setGrid(updatedGrid);
  };

  function setAcrossClueAtSelected() {
    setHasUnsavedChanges(true)
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
    setHasUnsavedChanges(true)
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
          //if (newValue) cell.letter = '';
        }
      };
  
      update(row, col);
      for (const [r, c] of getSymmetricCells(row, col)) {
        update(r, c);
      }
  
      return newGrid;
    });
  }

  function getCompleteWordAtSelected(): string | null {
  const coords = getWordCoordinates(grid, selected.row, selected.col, direction);
  const letters: string[] = [];

  for (const coord of coords) {
    const [rStr, cStr] = coord.split('-');
    const r = parseInt(rStr);
    const c = parseInt(cStr);

    if (!grid[r] || !grid[r][c]) return null;

    const letter = grid[r][c].letter;
    if (letter === '') return null; // Incomplete word

    letters.push(letter);
  }

  for (const coord of coords) {
    const [rStr, cStr] = coord.split('-');
    const r = parseInt(rStr);
    const c = parseInt(cStr);

    grid[r][c].letter = ""
  }

  return letters.join('');
}

  function handleAddToBlacklist() {
    setHasUnsavedChanges(true)
    const word = getCompleteWordAtSelected();
    if (!word) {
      alert('Selected word is incomplete.');
      return;
    }

    const existing = blacklist.split(' ').map(w => w.trim());

    if (!existing.includes(word)) {
      const updated = [...existing, word].join(' ');
      setBlacklist(updated);
    } else {
      alert('Word is already in the blacklist.');
    }
  }

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      setHasUnsavedChanges(true)
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
      } else if (/^[a-zA-ZčćžšđČĆŽŠĐ]$/.test(e.key)) {
        const currLetter = grid[row][col].letter.toUpperCase();
        const keyPressed = e.key.toUpperCase();

        // Check for digraph formation
        const combined = currLetter + keyPressed;
        const digraphChar = digraphMap[combined];
        if (digraphChar) {
          setGrid(prev => {
            const newGrid = prev.map(r => [...r]);
            newGrid[row][col].letter = digraphChar;
            return newGrid;
          });
          if (direction === 'across' && col < width - 1) newCol = col + 1;
          else if (direction === 'down' && row < height - 1) newRow = row + 1;
          setSelected({ row: newRow, col: newCol });
          return;
        }

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
    setHasUnsavedChanges(true)

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
        {/* Mode Selector */}
        <div className="mb-4">
          <h3 className="font-semibold">Mode:</h3>
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
            className={`block w-full mb-2 px-3 py-1 rounded ${mode === 'paint' ? 'bg-gray-300' : 'bg-blue-500 text-white hover:bg-blue-600'}`}
          >
            Paint Mode
          </button>
          <button
            onClick={() => setMode('zone')}
            disabled={mode === 'zone'}
            className={`block w-full mb-2 px-3 py-1 rounded ${mode === 'zone' ? 'bg-gray-300' : 'bg-blue-500 text-white hover:bg-blue-600'}`}
          >
            Zone Mode
          </button>
        </div>

        <div className="mb-4">
          <h3 className="font-semibold">Set clues:</h3>
          <button
            onClick={applyAutoClueMarking}
            className="px-3 mb-2 py-1 bg-green-600 text-white rounded hover:bg-green-700 w-full"
          >
            Auto Mark Clues
          </button>

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
        </div>
  
        {/* Symmetry Toggles */}
        <div className="mb-4">
          <h3 className="font-semibold">Symmetry:</h3>
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
        <label className="block font-semibold">Autofill Options:</label>
        <button
          onClick={() => {
            setGrid(prev => prev.map(row => row.map(cell => ({ ...cell, isAutofillZone: false }))));
          }}
          className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 w-full"
        >
          Reset Autofill Zone
        </button>

        <button
          onClick={() => handleAutofill("")}
          disabled={loading}
          className={`mt-2 w-full py-2 px-4 rounded-md text-white ${
            loading ? 'bg-gray-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700'
          }`}
        >
          {loading ? 'Autofilling...' : 'Autofill'}
        </button>
        <button
          onClick={handleNextFill}
          className="px-3 py-1 rounded bg-purple-600 text-white hover:bg-purple-700"
        >
          Next Fill
        </button>
        {autofillError && (
          <p className="text-sm text-red-500 mt-2">{autofillError}</p>
        )}

        <div className="mb-4">
          <label className="block mb-2 text-sm">
            Minimum word quality: (0–50):
            <input
              type="number"
              min={0}
              max={50}
              value={minQuality}
              onChange={e => setMinQuality(parseInt(e.target.value))}
              className="ml-2 w-16 border px-1 py-0.5 rounded"
            />
          </label>

          <label className="block font-semibold">Blacklist Options:</label>
          <button
            onClick={handleAddToBlacklist}
            className="mt-2 w-full py-1 px-3 bg-yellow-600 text-white rounded hover:bg-yellow-700"
          >
            Blacklist Selected
          </button>

          <label className="block mt-2 text-sm">
            Blacklisted Words (space-separated):
            <textarea
              rows={2}
              value={blacklist}
              onChange={e => {
                setHasUnsavedChanges(true)
                let value = e.target.value.toUpperCase()

                if (language == "hr") value = value.replaceAll('LJ', 'Ǉ').replaceAll('NJ', 'Ǌ').replaceAll('DŽ', 'Ǆ')
                setBlacklist(value)
              }}
              className="w-full mt-1 border px-2 py-1 rounded resize-y"
              onKeyDown={e => e.stopPropagation()}
              placeholder="ODESSA IONIC ELBA"
            />
          </label>
        </div>

        <div className="mb-4">
          <button
            onClick={() => setShowOptions(!showOptions)}
            className="w-full px-3 py-1 bg-gray-500 text-white rounded hover:bg-gray-600"
          >
            Additional Options
          </button>
          <button
            onClick={handleSave}
            className="mt-4 w-full py-2 px-4 rounded-md bg-blue-600 text-white hover:bg-blue-700"
          >
            Save Crossword
          </button>
        </div>
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
                ? 'bg-gray-200'
                : 'bg-white';
  
              const border = cell.isAutofillZone
                ? 'border-2 border-red-500'
                : isSelected
                ? 'border-2 border-teal-700'
                : isHighlighted
                ? 'border-2 border-gray-300'
                : 'border border-gray-300';
  
              return (
                <div
                  key={key}
                  onMouseDown={e => {
                    setHasUnsavedChanges(true)
                    e.preventDefault();
                    e.stopPropagation();
                    setMouseButton(e.button);
  
                    if (mode === 'paint') {
                      const newValue = !(e.button === 2);
  
                      applyBlackChangeWithSymmetry(rowIndex, colIndex, newValue);
                    } else if (mode === 'zone') {
                      setGrid(prev => {
                        const newGrid = prev.map(row => row.map(cell => ({ ...cell })));
                        if (e.button === 0) newGrid[rowIndex][colIndex].isAutofillZone = true;
                        else if (e.button === 2) newGrid[rowIndex][colIndex].isAutofillZone = false;
                        return newGrid;
                      });
                    } else if (mode === 'edit' && e.button === 2) {
                      // Right-click in edit mode: delete letter
                      setGrid(prev => {
                        const newGrid = prev.map(r => [...r]);
                        newGrid[rowIndex][colIndex].letter = '';
                        return newGrid;
                      });
                  }
                    else {
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
                    } else if (mode === 'zone') {
                      setGrid(prev => {
                        const newGrid = prev.map(row => row.map(cell => ({ ...cell })));
                        if (mouseButton === 0) newGrid[rowIndex][colIndex].isAutofillZone = true;
                        else if (mouseButton === 2) newGrid[rowIndex][colIndex].isAutofillZone = false;
                        return newGrid;
                      });
                    }else if (mode === 'edit' && mouseButton === 2) {
                        setGrid(prev => {
                          const newGrid = prev.map(r => [...r]);
                          newGrid[rowIndex][colIndex].letter = '';
                          return newGrid;
                        });
                  }}}
                  onContextMenu={e => e.preventDefault()}
                  className={`aspect-square ${bg} ${border} flex items-center overflow-hidden justify-center font-bold cursor-pointer select-none box-border relative`}
                  style={{ fontSize: '200%', lineHeight: 1 }}
                >
                  {/* Clue number in top-left */}
                  {cell.clueNo != null && (
                    <div className="absolute top-[2px] left-[2px] text-[10px] text-gray-700 leading-none">
                      {cell.clueNo}
                    </div>
                  )}
                  
                  {!cell.isBlack ? cell.letter : ''}
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
                      setHasUnsavedChanges(true)
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
      <OptionsModal
      isOpen={showOptions}
      onClose={() => setShowOptions(false)}
      pendingWidth={pendingWidth}
      pendingHeight={pendingHeight}
      setPendingWidth={setPendingWidth}
      setPendingHeight={setPendingHeight}
      applyDimensions={applyDimensions}
      language={language}
      setLanguage={setLanguage}
      clearGridLetters={clearGridLetters}
    />
    </main>
  );
}