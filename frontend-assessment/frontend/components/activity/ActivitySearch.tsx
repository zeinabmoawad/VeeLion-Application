type ActivitySearchProps = {
  value: string;
  onChange: (value: string) => void;
};

export function ActivitySearch({ value, onChange }: ActivitySearchProps) {
  return (
    <input
      className="input"
      placeholder="Search activity"
      value={value}
      onChange={(event) => onChange(event.target.value)}
    />
  );
}
