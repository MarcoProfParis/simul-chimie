import { createContext, useContext } from "react";

const TabsContext = createContext({});

export function Tabs({ value, onValueChange, children, className }) {
  return (
    <TabsContext.Provider value={{ active: value, onChange: onValueChange }}>
      <div className={className}>{children}</div>
    </TabsContext.Provider>
  );
}

export function TabsList({ children, className, style }) {
  return (
    <div
      className={className}
      style={{
        display: "flex",
        borderBottom: "1px solid var(--color-border-tertiary)",
        marginBottom: 14,
        gap: 0,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export function TabsTrigger({ value, children, className }) {
  const { active, onChange } = useContext(TabsContext);
  const isActive = active === value;
  return (
    <button
      onClick={() => onChange(value)}
      className={className}
      style={{
        padding: "7px 16px",
        fontSize: 11,
        fontWeight: 700,
        border: "none",
        background: "transparent",
        cursor: "pointer",
        letterSpacing: ".06em",
        textTransform: "uppercase",
        color: isActive ? "var(--color-text-primary)" : "var(--color-text-secondary)",
        borderBottom: isActive ? "2.5px solid var(--color-text-primary)" : "2.5px solid transparent",
        marginBottom: -1,
        transition: "color .12s",
      }}
    >
      {children}
    </button>
  );
}
