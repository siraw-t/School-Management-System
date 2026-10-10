import { useEffect, useState } from 'react';
import { useAuth } from './context/AuthContext';
import { canWrite } from './permissions';

export function useMediaQuery(query) {
  const [matches, setMatches] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia(query).matches : false
  );
  useEffect(() => {
    const mql = window.matchMedia(query);
    const onChange = (e) => setMatches(e.matches);
    mql.addEventListener('change', onChange);
    setMatches(mql.matches);
    return () => mql.removeEventListener('change', onChange);
  }, [query]);
  return matches;
}

export function useResponsive() {
  const isMobile = useMediaQuery('(max-width: 720px)');
  const isTablet = useMediaQuery('(max-width: 1100px)');
  const isSidebarCollapsed = useMediaQuery('(max-width: 980px)');
  return { isMobile, isTablet, isSidebarCollapsed };
}

export function useHover() {
  const [hovered, setHovered] = useState(false);
  return {
    hovered,
    bind: {
      onMouseEnter: () => setHovered(true),
      onMouseLeave: () => setHovered(false),
    },
  };
}

export function useCan(resource) {
  const { user } = useAuth();
  return canWrite(user?.role, resource);
}