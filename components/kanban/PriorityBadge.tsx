import { Priority } from '@/lib/kanban/types';
import { Badge } from '@/components/ui/badge';

interface PriorityBadgeProps {
  priority: Priority;
  className?: string;
}

const priorityColors = {
  Critical: 'bg-red-500 hover:bg-red-600 text-white',
  High: 'bg-orange-500 hover:bg-orange-600 text-white',
  Medium: 'bg-yellow-500 hover:bg-yellow-600 text-white',
  Low: 'bg-green-500 hover:bg-green-600 text-white',
  V2: 'bg-gray-500 hover:bg-gray-600 text-white',
  None: 'bg-gray-200 hover:bg-gray-300 text-gray-700',
};

export function PriorityBadge({ priority, className = '' }: PriorityBadgeProps) {
  return (
    <Badge className={`${priorityColors[priority]} ${className}`}>
      {priority}
    </Badge>
  );
}
