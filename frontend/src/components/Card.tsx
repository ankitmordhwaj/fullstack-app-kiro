import React from 'react';
import styles from './Card.module.css';

interface CardProps {
  readonly children: React.ReactNode;
  readonly className?: string;
}

function Card({ children, className }: CardProps) {
  return (
    <div className={[styles.card, className].filter(Boolean).join(' ')}>
      {children}
    </div>
  );
}

export default Card;
