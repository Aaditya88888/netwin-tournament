import React from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { cn } from "@/lib/utils";
import { CalendarDays, Clock } from "lucide-react";


interface DateTimePickerProps {
  selected: Date | null;
  onChange: (date: Date | null) => void;
  placeholderText?: string;
  disabled?: boolean;
  className?: string;
  minDate?: Date;
  maxDate?: Date;
}

export const DateTimePicker: React.FC<DateTimePickerProps> = ({
  selected,
  onChange,
  placeholderText = "Select date and time",
  disabled = false,
  className,
  minDate,
  maxDate,
}) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const datePickerRef = React.useRef<any>(null);

  const handleIconClick = () => {
    if (datePickerRef.current) {
      setIsOpen(!isOpen);
    }
  };

  return (
    <div className="relative">
      <DatePicker
        ref={datePickerRef}
        selected={selected}
        onChange={onChange}
        showTimeSelect
        timeFormat="HH:mm"
        timeIntervals={15}
        dateFormat="dd/MM/yyyy h:mm aa"
        placeholderText={placeholderText}
        disabled={disabled}
        minDate={minDate}
        maxDate={maxDate}
        open={isOpen}
        onClickOutside={() => setIsOpen(false)}
        onFocus={() => setIsOpen(true)}
        className={cn(
          "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 pr-10 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        popperClassName="react-datepicker-popper"
        calendarClassName="react-datepicker-calendar"
      />
      <div 
        className="absolute inset-y-0 right-0 flex items-center pr-3 cursor-pointer hover:bg-accent rounded-r-md transition-colors z-10"
        onClick={handleIconClick}
        title="Open calendar"
      >
        <CalendarDays className="h-4 w-4 text-muted-foreground hover:text-foreground transition-colors" />
      </div>
    </div>
  );
};

// Custom styles for the date picker to match the dark theme
const datePickerStyles = `
  .react-datepicker-popper {
    z-index: 9999;
  }
  
  .react-datepicker {
    font-family: inherit;
    background-color: hsl(var(--card));
    border: 1px solid hsl(var(--border));
    border-radius: 8px;
    color: hsl(var(--card-foreground));
  }
  
  .react-datepicker__header {
    background-color: hsl(var(--muted));
    border-bottom: 1px solid hsl(var(--border));
    padding: 0.5rem;
  }
  
  .react-datepicker__current-month {
    color: hsl(var(--foreground));
    font-weight: 600;
  }
  
  .react-datepicker__day-name {
    color: hsl(var(--muted-foreground));
  }
  
  .react-datepicker__day {
    color: hsl(var(--foreground));
    border-radius: 4px;
  }
  
  .react-datepicker__day:hover {
    background-color: hsl(var(--accent));
    color: hsl(var(--accent-foreground));
  }
  
  .react-datepicker__day--selected {
    background-color: hsl(var(--primary));
    color: hsl(var(--primary-foreground));
  }
  
  .react-datepicker__day--keyboard-selected {
    background-color: hsl(var(--primary));
    color: hsl(var(--primary-foreground));
  }
  
  .react-datepicker__day--disabled {
    color: hsl(var(--muted-foreground));
    cursor: not-allowed;
  }
  
  .react-datepicker__time-container {
    border-left: 1px solid hsl(var(--border));
  }
  
  .react-datepicker__time-box {
    background-color: hsl(var(--card));
  }
  
  .react-datepicker__time-list-item {
    color: hsl(var(--foreground));
  }
  
  .react-datepicker__time-list-item:hover {
    background-color: hsl(var(--accent));
    color: hsl(var(--accent-foreground));
  }
  
  .react-datepicker__time-list-item--selected {
    background-color: hsl(var(--primary));
    color: hsl(var(--primary-foreground));
  }
  
  .react-datepicker__navigation {
    top: 13px;
  }
  
  .react-datepicker__navigation-icon::before {
    border-color: hsl(var(--foreground));
  }
  
  .react-datepicker__month-container {
    background-color: hsl(var(--card));
  }
`;

// Inject styles
if (typeof document !== 'undefined') {
  const styleElement = document.createElement('style');
  styleElement.textContent = datePickerStyles;
  document.head.appendChild(styleElement);
}
