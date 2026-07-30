import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import CinematicLanding from './CinematicLanding';

const renderLanding = (onStart = vi.fn()) => {
  render(
    <MemoryRouter>
      <CinematicLanding onStart={onStart} />
    </MemoryRouter>,
  );

  return onStart;
};

describe('CinematicLanding', () => {
  it('expone el relato principal y conserva la navegación de la experiencia', () => {
    renderLanding();

    expect(
      screen.getByRole('heading', {
        name: /diario emocional visual con inteligencia artificial/i,
      }),
    ).toBeInTheDocument();
    const heroLogo = screen.getByTestId('app-logo').querySelector('img');
    expect(heroLogo).toHaveAttribute('src', '/logo.jpg');
    expect(screen.getByRole('link', { name: /desliza para sentir/i })).toHaveAttribute(
      'href',
      '#experiencia',
    );
    // Header always visible with real app logo
    const header = screen.getByRole('banner');
    expect(header).not.toHaveAttribute('inert');
    expect(header.querySelector('img[src="/logo.jpg"]')).toBeTruthy();
    expect(screen.getByText(/la historia está en lo que se repite/i)).toBeInTheDocument();
    expect(screen.getAllByText(/tu mundo interior no es un producto/i).length).toBeGreaterThanOrEqual(1);
  });

  it('muestra el orbe emocional en el hero y el journey de experiencia', () => {
    renderLanding();

    const orbs = screen.getAllByTestId('emotion-orb');
    expect(orbs.length).toBeGreaterThanOrEqual(1);
    expect(orbs[0]).toHaveAttribute('data-phase', 'capture');
    expect(screen.getByLabelText(/cómo funciona moodless/i)).toBeInTheDocument();
  });

  it('actualiza el registro visual, la mascota del orbe y abre el inicio desde el CTA final', () => {
    const onStart = renderLanding();

    const calmMascots = screen.getAllByTestId('emotion-orb-mascot');
    expect(calmMascots[0]).toHaveAttribute('data-tone', 'calma');
    expect(calmMascots[0]).toHaveAttribute('data-mascot', '/mascot_calm_nobg.png');

    // Las 5 emociones del producto
    expect(screen.getByRole('button', { name: /alegría/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^calma/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /energía/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /miedo/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /tristeza/i })).toBeInTheDocument();

    const energyTone = screen.getByRole('button', { name: /energía/i });
    fireEvent.click(energyTone);
    expect(energyTone).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('status')).toHaveTextContent('Energía');

    const energyMascots = screen.getAllByTestId('emotion-orb-mascot');
    expect(energyMascots.every((el) => el.getAttribute('data-tone') === 'energia')).toBe(true);
    expect(energyMascots[0]).toHaveAttribute('data-mascot', '/mascot_joy_nobg.png');

    const sadnessTone = screen.getByRole('button', { name: /tristeza/i });
    fireEvent.click(sadnessTone);
    expect(screen.getByRole('status')).toHaveTextContent('Tristeza');
    expect(
      screen.getAllByTestId('emotion-orb-mascot').every((el) => el.getAttribute('data-tone') === 'tristeza'),
    ).toBe(true);
    expect(screen.getAllByTestId('emotion-orb-mascot')[0]).toHaveAttribute(
      'data-mascot',
      '/mascot_sadness_nobg.png',
    );

    const finale = screen.getByRole('region', { name: /haz visible lo que llevas dentro/i });
    const startButton = screen.getByRole('button', { name: /crear mi espacio emocional/i });
    expect(finale).toContainElement(startButton);

    fireEvent.click(startButton);
    expect(onStart).toHaveBeenCalledWith('signup');
  });
});
