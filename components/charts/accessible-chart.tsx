import type { ReactNode } from "react";

interface AccessibleChartProps {
  /** Short spoken summary — announced via role="img" the same way a static image's
   *  alt text would be. */
  ariaLabel: string;
  tableCaption: string;
  headers: string[];
  rows: (string | number)[][];
  children: ReactNode;
}

/**
 * Wraps a Recharts chart with a screen-reader-only data table alongside an
 * aria-label — the charts here are genuinely tabular data (a value per day/night/
 * minute), so a real table is more useful to assistive tech than a text summary
 * alone. Mirrors the role="group" + aria-hidden visual + accessible-name pattern
 * already used by ScoreRing/MetricCard/WorkoutRecommender, adapted for an image-like
 * chart (role="img") plus its underlying table instead of a single computed string.
 */
export function AccessibleChart({ ariaLabel, tableCaption, headers, rows, children }: AccessibleChartProps) {
  return (
    <div role="img" aria-label={ariaLabel}>
      <div aria-hidden="true">{children}</div>
      <table className="sr-only">
        <caption>{tableCaption}</caption>
        <thead>
          <tr>
            {headers.map((header) => (
              <th key={header} scope="col">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i}>
              {row.map((cell, j) => (
                <td key={j}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
