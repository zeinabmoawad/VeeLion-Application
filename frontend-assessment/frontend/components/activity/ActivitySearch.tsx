import { SearchOutlined } from "@ant-design/icons";
import { Input } from "antd";

type ActivitySearchProps = {
  value: string;
  onChange: (value: string) => void;
};

export function ActivitySearch({ value, onChange }: ActivitySearchProps) {
  return (
    <Input
      type="search"
      size="large"
      allowClear
      aria-label="Search activity"
      placeholder="Search by action or details"
      prefix={<SearchOutlined />}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          onChange("");
        }
      }}
      className="activity-search"
    />
  );
}
