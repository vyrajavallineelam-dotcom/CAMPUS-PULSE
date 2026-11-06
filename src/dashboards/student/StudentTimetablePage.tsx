import React, { useState, useEffect } from 'react';
import { WeeklyTimetableGrid } from '../../components/timetable/WeeklyTimetableGrid';
import { DailyTimetableList } from '../../components/timetable/DailyTimetableList';
import { useAuth } from '../../hooks/useAuth';
import { timetableService } from '../../services/timetableService';
import { apiService } from '../../services/apiService';
import { DAYS_OF_WEEK } from '../../utils/timeUtils';
import { DayOfWeek, TimetableEntry } from '../../types';
import { Calendar, Printer, Download, Sparkles, RefreshCw } from 'lucide-react';

export const StudentTimetablePage: React.FC = () => {
  const { session } = useAuth();
  const [viewMode, setViewMode] = useState<'weekly' | 'daily'>('weekly');
  const [activeDay, setActiveDay] = useState<DayOfWeek>('Monday');

  const defaultSection = session?.sectionId || 'II AIML-J';
  const [selectedSection, setSelectedSection] = useState(defaultSection);
  const [sectionsList, setSectionsList] = useState<string[]>([]);

  useEffect(() => {
    apiService.getSections().then(secs => {
      if (secs && secs.length) {
        const unique = Array.from(new Set(secs.map(s => s.name))).sort();
        setSectionsList(unique);
      }
    }).catch(() => {});
  }, []);

  const [entries, setEntries] = useState<TimetableEntry[]>(() => timetableService.getStudentSchedule(selectedSection));
  const [isLoading, setIsLoading] = useState(false);

  const fetchLiveEntries = () => {
    setIsLoading(true);
    apiService.getTimetables({ sectionId: selectedSection })
      .then(res => {
        if (res && res.length) {
          setEntries(res);
        }
      })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    fetchLiveEntries();
  }, [selectedSection]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-2xl font-extrabold text-[#142B4A]">
            My Official Section Timetable
          </h1>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs text-slate-500">Section:</span>
            {sectionsList.length > 0 ? (
              <select
                value={selectedSection}
                onChange={e => setSelectedSection(e.target.value)}
                className="text-xs font-bold text-blue-700 bg-blue-50 border border-blue-200 rounded-lg px-2 py-1 outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
              >
                {sectionsList.map(secName => (
                  <option key={secName} value={secName}>
                    {secName}
                  </option>
                ))}
              </select>
            ) : (
              <strong className="text-xs text-blue-700">{selectedSection}</strong>
            )}
            <span className="text-xs text-slate-400">• Academic Year 2026-2027 (I Semester)</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchLiveEntries}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-xl text-xs font-bold text-slate-700 transition-colors"
            title="Refresh from server"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-blue-600' : ''}`} />
            <span>Sync</span>
          </button>

          <div className="inline-flex rounded-xl bg-slate-200/80 p-1 text-xs font-bold">
            <button
              onClick={() => setViewMode('weekly')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                viewMode === 'weekly' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-600'
              }`}
            >
              Weekly View
            </button>
            <button
              onClick={() => setViewMode('daily')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                viewMode === 'daily' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-600'
              }`}
            >
              Daily View
            </button>
          </div>

          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-100"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print</span>
          </button>
        </div>
      </div>

      {viewMode === 'daily' && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {DAYS_OF_WEEK.map(d => (
            <button
              key={d}
              onClick={() => setActiveDay(d)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                activeDay === d
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              {d}
            </button>
          ))}
        </div>
      )}

      {viewMode === 'weekly' ? (
        <WeeklyTimetableGrid entries={entries} />
      ) : (
        <DailyTimetableList entries={entries} day={activeDay} />
      )}
    </div>
  );
};
