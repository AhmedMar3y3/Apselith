import { fireEvent, render, screen, cleanup } from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';
import { Laboratory } from '../src/features/orbital-simulator/Laboratory';
afterEach(cleanup);
it('updates real calculated values and rejects Earth-intersecting inputs', () => {
  render(<Laboratory />);
  expect(screen.getByText('165.9')).toBeInTheDocument();
  fireEvent.change(
    screen.getByRole('spinbutton', { name: 'Semi-major axis' }),
    { target: { value: '12000' } },
  );
  expect(screen.queryByText('165.9')).not.toBeInTheDocument();
  fireEvent.change(screen.getByRole('spinbutton', { name: 'Eccentricity' }), {
    target: { value: '0.9' },
  });
  expect(screen.getByRole('alert')).toHaveTextContent('intersects Earth');
});
