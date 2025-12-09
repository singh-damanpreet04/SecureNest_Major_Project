import { useState, useCallback } from 'react';

export const useScheduler = () => {
  const [isSchedulerOpen, setIsSchedulerOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);

  const openScheduler = useCallback((user = null) => {
    setSelectedUser(user);
    setIsSchedulerOpen(true);
  }, []);

  const closeScheduler = useCallback(() => {
    setIsSchedulerOpen(false);
    setSelectedUser(null);
  }, []);

  return {
    isSchedulerOpen,
    selectedUser,
    openScheduler,
    closeScheduler,
  };
};
