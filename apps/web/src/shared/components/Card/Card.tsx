import type { HTMLAttributes, ReactNode } from 'react';
import './Card.css';

type CardProps = HTMLAttributes<HTMLElement> & {
  children: ReactNode;
  as?: 'article' | 'section' | 'div';
};

export function Card({ as = 'div', children, className = '', ...props }: CardProps) {
  const Component = as;
  const cardClassName = ['card', className].filter(Boolean).join(' ');

  return (
    <Component className={cardClassName} {...props}>
      {children}
    </Component>
  );
}
