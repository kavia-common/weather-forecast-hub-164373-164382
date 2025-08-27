import { render, screen } from '@testing-library/react';
import App from './App';

test('renders weather title', () => {
  render(<App />);
  const title = screen.getByText(/Weather Forecast/i);
  expect(title).toBeInTheDocument();
});
