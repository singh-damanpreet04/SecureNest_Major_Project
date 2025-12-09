import React, { useState } from 'react';
import { FiClock, FiX } from 'react-icons/fi';
import Scheduler from './Scheduler';

const SchedulerButton = ({ onClick }) => {
  return (
    <button
      onClick={onClick}
      className="px-3 py-2 text-sm font-medium text-indigo-300 hover:text-white rounded-md hover:bg-indigo-800 transition-colors flex items-center gap-2"
      title="Schedule a message"
    >
      <FiClock className="h-5 w-5" />
      <span className="hidden sm:inline">Schedule</span>
    </button>
  );
};

export default SchedulerButton;
