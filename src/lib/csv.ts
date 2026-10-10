export function toCsv(rows: (string | number)[][]) {
  const cell = (value: string | number) => {
    const text = String(value);
    const safe = typeof value === "string" && /^[\s]*[=+\-@]/.test(text) ? `'${text}` : text;
    return `"${safe.replaceAll('"', '""')}"`;
  };
  return `\uFEFF${rows.map((row) => row.map(cell).join(";")).join("\r\n")}`;
}
