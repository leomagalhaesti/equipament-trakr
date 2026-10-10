import { describe, expect, it } from "vitest";

import { toCsv } from "@/lib/csv";

describe("daily CSV formatting", () => {
  it("uses Excel-friendly delimiters, quotes, and formula protection", () => {
    expect(
      toCsv([
        ["Item", "Detalhes"],
        ["Notebook", 'Modelo "X"; revisão'],
        ["=1+1", "texto"],
      ]),
    ).toBe('\uFEFF"Item";"Detalhes"\r\n"Notebook";"Modelo ""X""; revisão"\r\n"\'=1+1";"texto"');
  });
});
