export default function OptionsModal({
  isOpen,
  onClose,
  pendingWidth,
  pendingHeight,
  setPendingWidth,
  setPendingHeight,
  applyDimensions,
  language,
  setLanguage,
  clearGridLetters
}: {
  isOpen: boolean;
  onClose: () => void;
  pendingWidth: number;
  pendingHeight: number;
  setPendingWidth: (n: number) => void;
  setPendingHeight: (n: number) => void;
  applyDimensions: () => void;
  language: 'en' | 'hr';
  setLanguage: (l: 'en' | 'hr') => void;
  clearGridLetters: () => void;
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex justify-center items-center z-50">
      <div className="bg-white p-6 rounded shadow-lg w-96">
        <h2 className="text-xl font-bold mb-4">Options</h2>
        
        <label className="block mb-2">
          Width:
          <input
            type="number"
            min={1}
            max={50}
            value={pendingWidth}
            onChange={e => setPendingWidth(parseInt(e.target.value))}
            className="ml-2 w-16 border px-1 py-0.5 rounded"
          />
        </label>

        <label className="block mb-2">
          Height:
          <input
            type="number"
            min={1}
            max={50}
            value={pendingHeight}
            onChange={e => setPendingHeight(parseInt(e.target.value))}
            className="ml-2 w-16 border px-1 py-0.5 rounded"
          />
        </label>

        <label className="block mb-4">
          Language:
          <select
            value={language}
            onChange={e => setLanguage(e.target.value as 'en' | 'hr')}
            className="ml-2 border px-2 py-1 rounded"
          >
            <option value="en">English</option>
            <option value="hr">Croatian</option>
          </select>
        </label>

        <label className="block mb-4">
          <button
            onClick={clearGridLetters}
            className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Clear Grid Letters
          </button>
        </label>

        <div className="flex justify-end space-x-2">
          <button
            onClick={onClose}
            className="px-3 py-1 rounded bg-gray-300 hover:bg-gray-400"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              applyDimensions();
              onClose();
            }}
            className="px-3 py-1 rounded bg-blue-600 text-white hover:bg-blue-700"
          >
            Apply
          </button>
        </div>
      </div>
      
    </div>
  );
}