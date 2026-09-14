import { describe, it, expect } from "vitest";
import { getHighchartsBaseOptions } from "../chartHelpers";

describe("chartHelpers - getHighchartsBaseOptions", () => {
  it("genera opciones base para tema claro por defecto", () => {
    const opts = getHighchartsBaseOptions(false);
    expect(opts.chart.backgroundColor).toBe("transparent");
    expect(opts.credits.enabled).toBe(false);
    expect(opts.title.text).toBeNull();
    expect(opts._colors.textColor).toBe("#333333");
    expect(opts._colors.labelColor).toBe("#666666");
    expect(opts._colors.gridLineColor).toBe("#E6E6E6");
    expect(opts._colors.lineColor).toBe("#CCD6EB");
    expect(opts.legend.itemStyle.color).toBe("#333333");
  });

  it("genera opciones base para tema oscuro", () => {
    const opts = getHighchartsBaseOptions(true);
    expect(opts.chart.backgroundColor).toBe("transparent");
    expect(opts._colors.textColor).toBe("#E2E8F0");
    expect(opts._colors.labelColor).toBe("#94A3B8");
    expect(opts._colors.gridLineColor).toBe("#334155");
    expect(opts._colors.lineColor).toBe("#475569");
    expect(opts.legend.itemStyle.color).toBe("#E2E8F0");
    expect(opts.legend.itemHoverStyle.color).toBe("#FFFFFF");
  });

  it("acepta un ref booleano reactivo { value: true }", () => {
    const isDarkRef = { value: true };
    const opts = getHighchartsBaseOptions(isDarkRef);
    expect(opts._colors.textColor).toBe("#E2E8F0");
  });

  it("fusiona opciones personalizadas respetando las propiedades base", () => {
    const custom = {
      chart: { type: "column", height: 400 },
      tooltip: { enabled: true },
    };
    const opts = getHighchartsBaseOptions(false, custom);
    expect(opts.chart.type).toBe("column");
    expect(opts.chart.height).toBe(400);
    expect(opts.chart.backgroundColor).toBe("transparent");
    expect(opts.tooltip.enabled).toBe(true);
    expect(opts.credits.enabled).toBe(false);
  });
});
