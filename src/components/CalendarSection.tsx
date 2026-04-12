import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from "lucide-react";
import { type Birthday } from "../lib/supabase";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface CalendarSectionProps {
  month: number;
  year: number;
  monthNames: string[];
  prevMonth: () => void;
  nextMonth: () => void;
  firstDay: number;
  daysInMonth: number;
  birthdays: Birthday[];
}

export default function CalendarSection({
  month,
  year,
  monthNames,
  prevMonth,
  nextMonth,
  firstDay,
  daysInMonth,
  birthdays
}: CalendarSectionProps) {
  return (
    <section className="bg-[#1A1A2E] rounded-2xl p-6 border border-white/10 space-y-4">
      <div className="flex justify-between items-center text-white">
        <h2 className="text-lg font-bold flex items-center gap-2">
          <CalendarIcon className="w-5 h-5 text-indigo-400" />
          {monthNames[month]} {year}
        </h2>
        <div className="flex gap-2">
          <button onClick={prevMonth} className="p-2 hover:bg-white/5 rounded-lg border border-white/10"><ChevronLeft className="w-4 h-4" /></button>
          <button onClick={nextMonth} className="p-2 hover:bg-white/5 rounded-lg border border-white/10"><ChevronRight className="w-4 h-4" /></button>
        </div>
      </div>
      
      <div className="grid grid-cols-7 text-center text-[10px] font-bold text-gray-400 mb-2">
        {['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].map(d => <div key={d}>{d}</div>)}
      </div>
      
      <div className="calendar-grid">
        {Array.from({ length: firstDay }).map((_, i) => <div key={`empty-${i}`} className="cal-day empty" />)}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const dayNum = i + 1;
          const dayBirthdays = birthdays.filter(b => {
            const d = new Date(b.birth_date);
            return d.getUTCMonth() === month && d.getUTCDate() === dayNum;
          });
          const isToday = new Date().getDate() === dayNum && new Date().getMonth() === month && new Date().getFullYear() === year;

          return (
            <div key={dayNum} className={cn("cal-day", isToday && "today")}>
              <span className="mb-0.5">{dayNum}</span>
              <div className="flex flex-wrap gap-0.5 justify-center w-full">
                {dayBirthdays.map(b => (
                  <div 
                    key={b.id} 
                    className="birthday-dot" 
                    title={b.name}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
