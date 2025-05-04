import { useCallback } from 'react';

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
      <div className="flex items-center">
        <select
          className="px-4 py-2 rounded-lg border-r-8 border-transparent border outline outline-gray-200 dark:outline-gray-700 bg-white dark:bg-gray-800 text-base focus:outline-none focus:ring-2 focus:ring-[#2f3241] dark:focus:ring-[#9feaf9] transition-all"
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
      </div>
    </div>
  );
};
