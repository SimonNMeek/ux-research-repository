import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Search, Filter, Upload, Download, RotateCcw, ArrowUpDown, Shield, Cloud } from 'lucide-react';
import { Priority, SortOption } from '@/lib/kanban/types';
import { KanbanBackup } from '@/lib/kanban/backup';

interface ToolbarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  priorityFilter: Priority[];
  onPriorityFilterChange: (priorities: Priority[]) => void;
  sortOption: SortOption;
  onSortChange: (sort: SortOption) => void;
  onImport: () => void;
  onExportJSON: () => void;
  onExportCSV: () => void;
  onReset: () => void;
}

export function Toolbar({
  searchQuery,
  onSearchChange,
  priorityFilter,
  onPriorityFilterChange,
  sortOption,
  onSortChange,
  onImport,
  onExportJSON,
  onExportCSV,
  onReset,
}: ToolbarProps) {
  const [showPriorityFilter, setShowPriorityFilter] = useState(false);
  const [backupStatus, setBackupStatus] = useState({
    hasPrimary: false,
    hasBackup: false,
    hasIndexedDB: false,
    hasCloud: false,
    hasFilesystem: false,
    lastBackup: null as string | null
  });

  useEffect(() => {
    const status = KanbanBackup.getBackupStatus();
    setBackupStatus(status);
  }, []);

  const handlePriorityToggle = (priority: Priority) => {
    if (priorityFilter.includes(priority)) {
      onPriorityFilterChange(priorityFilter.filter(p => p !== priority));
    } else {
      onPriorityFilterChange([...priorityFilter, priority]);
    }
  };

  const priorities: Priority[] = ['Critical', 'High', 'Medium', 'Low', 'V2', 'None'];

  return (
    <div className="bg-white border-b p-4 space-y-4">
      <div className="flex items-center gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search cards..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <Select value={sortOption} onValueChange={onSortChange}>
          <SelectTrigger className="w-[140px]">
            <ArrowUpDown className="h-4 w-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="priority">Severity</SelectItem>
            <SelectItem value="date">Date Added</SelectItem>
          </SelectContent>
        </Select>
        
        <Button
          variant="outline"
          onClick={() => setShowPriorityFilter(!showPriorityFilter)}
          className={priorityFilter.length > 0 ? 'bg-blue-50 border-blue-200' : ''}
        >
          <Filter className="h-4 w-4 mr-2" />
          Priority {priorityFilter.length > 0 && `(${priorityFilter.length})`}
        </Button>
        
        <Button variant="outline" onClick={onImport}>
          <Upload className="h-4 w-4 mr-2" />
          Import
        </Button>
        
        <Button variant="outline" onClick={onExportCSV}>
          <Download className="h-4 w-4 mr-2" />
          Export CSV
        </Button>
        
        <Button variant="outline" onClick={onExportJSON}>
          <Download className="h-4 w-4 mr-2" />
          Export JSON
        </Button>
        
        <Button variant="outline" onClick={onReset}>
          <RotateCcw className="h-4 w-4 mr-2" />
          Reset
        </Button>
        
        {/* Backup Status Indicator */}
        <div className="flex items-center gap-2 ml-4">
          <Shield className="h-4 w-4 text-green-600" />
          <span className="text-sm text-gray-600">
            {backupStatus.hasPrimary ? '🟢' : '🔴'} Primary
            {backupStatus.hasBackup ? ' 🟢' : ' 🔴'} Backup
            {backupStatus.hasFilesystem ? ' 💾' : ' ❌'} Filesystem
            {backupStatus.lastBackup && (
              <span className="text-xs text-gray-500 ml-2">
                Last: {new Date(backupStatus.lastBackup).toLocaleDateString()}
              </span>
            )}
          </span>
        </div>
      </div>
      
      {showPriorityFilter && (
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">Filter by priority:</span>
          {priorities.map((priority) => (
            <Badge
              key={priority}
              variant={priorityFilter.includes(priority) ? 'default' : 'outline'}
              className="cursor-pointer"
              onClick={() => handlePriorityToggle(priority)}
            >
              {priority}
            </Badge>
          ))}
          {priorityFilter.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onPriorityFilterChange([])}
            >
              Clear
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
