import { useEffect } from 'react';

export const useEffectOnce = (effect) => {
  useEffect(() => {
    effect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
};
