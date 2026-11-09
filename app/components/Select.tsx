import { useCallback } from 'react';
import { ChevronsUpDown } from 'lucide-react';

type SelectProps = {
  isDisabled?: boolean;
  options: string[];
  selected: string;
  onChange: (value: string) => void;
  onClick?: () => void;
};

export const Select = ({ isDisabled, options, selected, onChange, onClick }: SelectProps) => {
  const onChangeHandler = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const value = e.target.value;
      onChange(value);
    },
    [onChange],
  );
  return (
    <div className="relative md:flex-grow-0">
      <label className="lu-field-box relative pr-8 cursor-default">
        <select
          className="appearance-none bg-transparent outline-none border-0 p-0 pr-1 min-w-0 cursor-default disabled:opacity-40"
          disabled={isDisabled}
          onChange={onChangeHandler}
          onClick={onClick}
          value={selected}
        >
          {options.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
        <ChevronsUpDown className="w-3.5 h-3.5 absolute right-2.5 text-ink-muted pointer-events-none" />
      </label>
    </div>
  );
};
