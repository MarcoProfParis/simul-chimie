import { useState, createContext, useContext } from "react";

const SelectCtx = createContext({});

export function Select({ value, onValueChange, children }) {
  const [open, setOpen] = useState(false);
  return (
    <SelectCtx.Provider value={{ value, onValueChange, open, setOpen }}>
      <div style={{ position: "relative", flex: 1, minWidth: 0 }}>
        {children}
      </div>
    </SelectCtx.Provider>
  );
}

export function SelectTrigger({ children, className }) {
  const { open, setOpen } = useContext(SelectCtx);
  return (
    <button
      className={className}
      onClick={() => setOpen(o => !o)}
      style={{
        width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "3px 8px", fontSize: 11, fontWeight: 700, cursor: "pointer",
        border: "0.5px solid var(--color-border-secondary)", borderRadius: 6,
        background: "var(--color-background-secondary)", color: "var(--color-text-primary)",
      }}
    >
      {children}
      <span style={{ marginLeft: 4, fontSize: 9, opacity: 0.5 }}>▾</span>
    </button>
  );
}

export function SelectValue() {
  const { value } = useContext(SelectCtx);
  return <span>{value}</span>;
}

export function SelectContent({ children }) {
  const { open } = useContext(SelectCtx);
  if (!open) return null;
  return (
    <div style={{
      position: "absolute", top: "100%", left: 0, right: 0, zIndex: 9999,
      background: "var(--color-background-primary)",
      border: "0.5px solid var(--color-border-secondary)",
      borderRadius: 6, boxShadow: "0 4px 12px rgba(0,0,0,0.12)",
      marginTop: 2, maxHeight: 200, overflowY: "auto",
    }}>
      {children}
    </div>
  );
}

export function SelectItem({ value, children, className }) {
  const { onValueChange, setOpen } = useContext(SelectCtx);
  return (
    <div
      className={className}
      onClick={() => { onValueChange(value); setOpen(false); }}
      style={{
        padding: "6px 10px", fontSize: 11, cursor: "pointer",
        color: "var(--color-text-primary)",
      }}
      onMouseEnter={e => e.currentTarget.style.background = "var(--color-background-secondary)"}
      onMouseLeave={e => e.currentTarget.style.background = "transparent"}
    >
      {children}
    </div>
  );
}
