import React from "react";
import { isQuadPure, quadPureTerm, formatTermDisplay } from "./modelUtils.js";
import { useLang } from "../../i18n";

export function PredictionPanel({ model, fit, factors, col }) {
  const { t } = useLang();
  const initVals = () => {
    const v = {};
    factors.forEach(f => { v[f.id] = f.continuous ? 0 : -1; });
    return v;
  };
  const [vals, setVals] = React.useState(initVals);
  const [predicted, setPredicted] = React.useState(null);

  const compute = () => {
    let y = fit.coeffs[0];
    model.terms.forEach((t, i) => {
      let val;
      if (isQuadPure(t, factors)) {
        const fac = factors.find(fc => t === quadPureTerm(fc.id));
        val = (vals[fac.id] ?? 0) ** 2;
      } else {
        val = factors.filter(fac => t.includes(fac.id)).reduce((p, fac) => p * (vals[fac.id] ?? 0), 1);
      }
      y += fit.coeffs[i + 1] * val;
    });
    setPredicted(y);
  };

  const toReal = (f, coded) => {
    if (!f.continuous) return coded === -1 ? (f.low.label || "−1") : (f.high.label || "+1");
    const mid = (f.low.real + f.high.real) / 2;
    const half = (f.high.real - f.low.real) / 2;
    return (mid + (+coded) * half).toFixed(2);
  };

  return (
    <div className="mt-4 border-t border-gray-100 pt-4">
      <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400 mb-3">
        {t("doe.predict.title")}
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
        {factors.map(f => {
          const coded = vals[f.id] ?? 0;
          return (
            <div key={f.id} className="flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-gray-600">
                  {f.id} — {f.name}
                </label>
                <span className="text-xs font-mono text-gray-500">
                  {f.continuous
                    ? <>{toReal(f, coded)} {f.unit || ""} <span className="text-gray-300">({(+coded).toFixed(2)})</span></>
                    : toReal(f, coded)
                  }
                </span>
              </div>
              {f.continuous ? (
                <div className="flex items-center gap-2">
                  <input type="range" min="-1" max="1" step="0.05"
                    value={coded}
                    onChange={e => { setVals(v => ({ ...v, [f.id]: +e.target.value })); setPredicted(null); }}
                    className="flex-1" />
                  <input type="number" min="-1" max="1" step="0.05" value={coded}
                    onChange={e => { setVals(v => ({ ...v, [f.id]: Math.max(-1, Math.min(1, +e.target.value)) })); setPredicted(null); }}
                    className="w-16 rounded-md border border-gray-200 bg-transparent px-2 py-1 text-xs font-mono text-gray-900 focus:outline-none focus:ring-1 focus:ring-indigo-400" />
                </div>
              ) : (
                <div className="flex gap-2">
                  <button
                    onClick={() => { setVals(v => ({ ...v, [f.id]: -1 })); setPredicted(null); }}
                    className={`flex-1 rounded-lg border px-2 py-1.5 text-xs font-mono transition-colors ${coded === -1 ? "bg-red-50 border-red-300 text-red-700" : "border-gray-200 text-gray-500 hover:border-gray-300"}`}>
                    −1 {f.low.label ? `(${f.low.label})` : ""}
                  </button>
                  <button
                    onClick={() => { setVals(v => ({ ...v, [f.id]: 1 })); setPredicted(null); }}
                    className={`flex-1 rounded-lg border px-2 py-1.5 text-xs font-mono transition-colors ${coded === 1 ? "bg-emerald-50 border-emerald-300 text-emerald-700" : "border-gray-200 text-gray-500 hover:border-gray-300"}`}>
                    +1 {f.high.label ? `(${f.high.label})` : ""}
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex items-center gap-4">
        <button onClick={compute}
          className={`rounded-lg px-4 py-2 text-sm font-semibold text-white transition-colors ${col.tab || "bg-indigo-600 hover:bg-indigo-500"}`}
          style={{ background: col.dot === "bg-indigo-500" ? "#6366f1" : col.dot === "bg-emerald-500" ? "#10b981" : "#f59e0b" }}>
          {t("doe.predict.btn")}
        </button>
        {predicted !== null && (
          <div className={`flex-1 flex items-center gap-3 rounded-xl border-2 ${col.border} ${col.bg} px-4 py-3`}>
            <div>
              <p className="text-[11px] text-gray-500 mb-0.5">{t("doe.predict.result")}</p>
              <p className={`text-2xl font-bold font-mono ${col.text}`}>{predicted.toFixed(4)}</p>
            </div>
            <div className="ml-auto text-xs text-gray-400 font-mono">
              Ŷ = {fit.coeffs[0].toFixed(4)}
              {model.terms.map((t, i) => {
                const c = fit.coeffs[i + 1];
                return ` ${c >= 0 ? "+" : "−"} ${Math.abs(c).toFixed(4)}·${formatTermDisplay(t, factors)}`;
              }).join("")}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
