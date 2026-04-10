import React from "react";

const CompactContext = React.createContext({ compact: false, setCompact: () => {} });

export function CompactProvider({ children }) {
  const [compact, setCompact] = React.useState(false);
  return (
    <CompactContext.Provider value={{ compact, setCompact }}>
      {children}
    </CompactContext.Provider>
  );
}

export function useCompact() {
  return React.useContext(CompactContext);
}
