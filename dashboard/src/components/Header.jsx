import React from 'react';
import { FiCalendar } from 'react-icons/fi';
import { formatHeaderDate } from '../utils/formatters';

export default function Header({ title }) {
  return (
    <header className="top-header">
      <h1 className="page-title">{title}</h1>
      <div className="header-controls">
        <div className="date-pill">
          <FiCalendar style={{ marginRight: '6px', verticalAlign: 'middle' }} />
          {formatHeaderDate()}
        </div>
      </div>
    </header>
  );
}
