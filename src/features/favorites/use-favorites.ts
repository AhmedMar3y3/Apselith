import { useState } from 'react';
import { z } from 'zod';
// Existing users retain saved favorites through the APSELITH rename.
const key = 'orbitlab:favorites';
function readFavorites() {
  try {
    const raw = localStorage.getItem(key);
    return {
      ids: raw
        ? z.array(z.number().int().positive()).parse(JSON.parse(raw))
        : [],
      error: '',
    };
  } catch {
    return {
      ids: [],
      error:
        'Saved favorites could not be read. You can still select satellites.',
    };
  }
}
export function useFavorites() {
  const [state, setState] = useState(readFavorites);
  function toggle(id: number) {
    const ids = state.ids.includes(id)
      ? state.ids.filter((value) => value !== id)
      : [...state.ids, id];
    try {
      localStorage.setItem(key, JSON.stringify(ids));
      setState({ ids, error: '' });
    } catch {
      setState({
        ids,
        error:
          'Favorites changed for this session; browser storage is unavailable.',
      });
    }
  }
  return { ...state, toggle };
}
