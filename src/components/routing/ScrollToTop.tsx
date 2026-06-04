import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

export function ScrollToTop() {
  const { pathname, search } = useLocation();

  useEffect(() => {
    const containers = document.querySelectorAll<HTMLElement>('[data-route-scroll-container]');
    if (containers.length) {
      containers.forEach((container) => container.scrollTo({ top: 0, left: 0, behavior: 'auto' }));
      return;
    }
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, [pathname, search]);

  return null;
}
