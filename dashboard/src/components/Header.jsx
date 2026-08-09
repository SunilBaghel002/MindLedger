import React from 'react';
import { formatHeaderDate } from '../utils/formatters';

export default function Header({ title }) {
  return (
    <header className="top-header">
      <h1 className="page-title">{title}</h1>
      <div className="header-controls">
        <div className="date-pill">{formatHeaderDate()}</div>
      </div>
    </header>
  );
}
