import { useEffect } from 'react';

const SITE_NAME = 'Erlandssons Entreprenad';

export function useDocumentTitle(title?: string) {
  useEffect(() => {
    document.title = title ? `${title} - ${SITE_NAME}` : SITE_NAME;
    
    return () => {
      // Reset to default when component unmounts (optional)
    };
  }, [title]);
}
