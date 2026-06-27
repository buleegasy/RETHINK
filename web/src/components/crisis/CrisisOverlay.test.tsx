import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CrisisOverlay } from './CrisisOverlay';

describe('CrisisOverlay Component', () => {
  it('renders title and subtitles correctly', () => {
    render(<CrisisOverlay />);

    expect(screen.getByText(/这世界总有人牵挂着你/)).toBeInTheDocument();
    expect(screen.getByText(/请留下来/)).toBeInTheDocument();
    expect(screen.getByText(/你不需要立刻好起来/)).toBeInTheDocument();
  });

  it('renders all three hotlines correctly', () => {
    render(<CrisisOverlay />);

    expect(screen.getByText('全国心理援助热线')).toBeInTheDocument();
    expect(screen.getByText('12355')).toBeInTheDocument();

    expect(screen.getByText('希望24小时热线')).toBeInTheDocument();
    expect(screen.getByText('400-161-9995')).toBeInTheDocument();

    expect(screen.getByText('北京心理危机研究与干预中心')).toBeInTheDocument();
    expect(screen.getByText('010-82951332')).toBeInTheDocument();
  });

  it('renders bottom disclaimer correctly without italic class', () => {
    render(<CrisisOverlay />);

    const disclaimer = screen.getByText('您的生命比一切都重要，请给自己一个被接住的机会。');
    expect(disclaimer).toBeInTheDocument();
    expect(disclaimer.className).not.toContain('italic');
  });
});
