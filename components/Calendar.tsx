import React, { useState, useMemo } from 'react';

interface CalendarProps {
  selectedDate: string; // YYYY-MM-DD
  onDateChange: (date: string) => void;
  onClose: () => void;
}

const Calendar: React.FC<CalendarProps> = ({ selectedDate, onDateChange }) => {
  const initialDate = selectedDate ? new Date(selectedDate + 'T00:00:00') : new Date();
   if (isNaN(initialDate.getTime())) {
    initialDate.setTime(new Date().getTime()); // Fallback to today if selectedDate is invalid
  }


  const [currentMonth, setCurrentMonth] = useState(new Date(initialDate.getFullYear(), initialDate.getMonth(), 1));

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const daysOfWeek = ['Lu', 'Ma', 'Me', 'Je', 'Ve', 'Sa', 'Di'];

  const { days, firstDayOfMonth, monthName, year } = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDayOfMonth = (new Date(year, month, 1).getDay() + 6) % 7; // 0=Monday, 6=Sunday
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
    const monthName = currentMonth.toLocaleString('fr-FR', { month: 'long' });

    return { days, firstDayOfMonth, monthName, year };
  }, [currentMonth]);

  const handlePrevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  const handleDateClick = (day: number) => {
    const newDate = new Date(year, currentMonth.getMonth(), day);
    if (newDate < today) return; // Prevent selecting past dates
    
    onDateChange(newDate.toISOString().split('T')[0]);
  };
  
  const selectedDateObj = selectedDate ? new Date(selectedDate + 'T00:00:00') : null;

  return (
    <div className="absolute z-10 mt-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl p-4 w-72">
      <div className="flex justify-between items-center mb-4">
        <button onClick={handlePrevMonth} className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700">&lt;</button>
        <div className="font-bold text-lg capitalize">{monthName} {year}</div>
        <button onClick={handleNextMonth} className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700">&gt;</button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-sm font-medium text-gray-500 dark:text-gray-400">
        {daysOfWeek.map(day => <div key={day}>{day}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-1 mt-2">
        {Array.from({ length: firstDayOfMonth }).map((_, index) => (
          <div key={`empty-${index}`} />
        ))}
        {days.map(day => {
          const date = new Date(year, currentMonth.getMonth(), day);
          const isPast = date < today;
          const isSelected = selectedDateObj && date.getTime() === selectedDateObj.getTime();
          const isToday = date.getTime() === today.getTime();

          const buttonClasses = [
            'w-9 h-9 flex items-center justify-center rounded-full transition-colors text-sm',
            isPast ? 'text-gray-400 dark:text-gray-500 cursor-not-allowed' : 'hover:bg-blue-100 dark:hover:bg-blue-900/50',
            isSelected ? 'bg-blue-600 text-white font-bold' : 'text-gray-700 dark:text-gray-200',
            !isSelected && isToday ? 'border-2 border-blue-500' : ''
          ].join(' ');

          return (
            <button
              key={day}
              onClick={() => handleDateClick(day)}
              disabled={isPast}
              className={buttonClasses}
            >
              {day}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default Calendar;
