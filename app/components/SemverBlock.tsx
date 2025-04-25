type SemverBlockProps = {
  activeStyle: string;
  isActive: boolean;
  title: string;
  description: string;
};

export const SemverBlock = ({ activeStyle, isActive, title, description }: SemverBlockProps) => {
  return (
    <div className={`p-4 rounded-lg ${isActive ? activeStyle : 'bg-gray-50 dark:bg-gray-900/20'}`}>
      <div className="text-center">
        <div className="text-lg font-bold mb-1">{title}</div>
        <div className="text-sm">{description}</div>
      </div>
    </div>
  );
};
