import { useId } from "react";

type ActivitySearchProps = {
  value: string;
  onChange: (value: string) => void;
};

export function ActivitySearch({ value, onChange }: ActivitySearchProps) {
  const inputId = useId();

  return (
    <div style={{ display: "flex", gap: "0.5rem" }}>
      <label htmlFor={inputId} className="visually-hidden">
        Search activity
      </label>
      <input
        id={inputId}
        type="search"
        className="input"
        placeholder="Search by action or details"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            onChange("");
          }
        }}
      />
      {value ? (
        <button type="button" className="button" onClick={() => onChange("")}>
          Clear
        </button>
      ) : null}
    </div>
  );
}
