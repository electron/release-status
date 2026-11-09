type SemverBlockProps = {
  activeStyle: string;
  isActive: boolean;
  title: string;
  description: string;
};

export const SemverBlock = ({ activeStyle, isActive, title, description }: SemverBlockProps) => {
  return (
    <div
      className={`lu-well px-4 py-3.5 transition-opacity ${isActive ? activeStyle : 'opacity-40'}`}
    >
      <div className="text-center">
        <div className="t-headline mb-0.5">{title}</div>
        <div className="t-dense text-ink-muted">{description}</div>
      </div>
    </div>
  );
};
