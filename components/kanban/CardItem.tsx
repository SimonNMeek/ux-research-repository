import { Card } from '@/lib/kanban/types';
import { PriorityBadge } from './PriorityBadge';
import { SidePanel } from './SidePanel';
import { useState } from 'react';
import { Card as CardComponent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, FileText, GripVertical } from 'lucide-react';

interface CardItemProps {
  card: Card;
  attachments: Record<string, any>;
  onUpdate: (card: Card) => void;
  onDelete: (cardId: string) => void;
  dragHandleProps?: any;
}

export function CardItem({ card, attachments, onUpdate, onDelete, dragHandleProps }: CardItemProps) {
  const [isSidePanelOpen, setIsSidePanelOpen] = useState(false);
  
  const attachmentCount = card.attachmentIds.length;
  const hasAttachments = attachmentCount > 0;
  
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <>
      <CardComponent 
        className="p-3 cursor-pointer hover:shadow-md transition-shadow"
        onClick={() => setIsSidePanelOpen(true)}
      >
        <div className="space-y-2">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-medium text-sm leading-tight">{card.title}</h3>
            <div className="flex items-center gap-2">
              <PriorityBadge priority={card.priority} className="text-xs" />
              {/* Drag handle inside the card */}
              <div 
                className="cursor-grab active:cursor-grabbing p-1 hover:bg-gray-100 rounded"
                {...dragHandleProps}
                title="Drag to move card"
                onClick={(e) => e.stopPropagation()} // Prevent card click when dragging
              >
                <GripVertical className="h-3 w-3 text-gray-400" />
              </div>
            </div>
          </div>
          
          {card.description && (
            <p className="text-xs text-gray-600 line-clamp-2">
              {card.description}
            </p>
          )}
          
          <div className="flex items-center justify-between text-xs text-gray-500">
            <div className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {formatDate(card.updatedAt)}
            </div>
            {hasAttachments && (
              <div className="flex items-center gap-1">
                <FileText className="h-3 w-3" />
                {attachmentCount}
              </div>
            )}
          </div>
        </div>
      </CardComponent>
      
      <SidePanel
        card={card}
        attachments={attachments}
        isOpen={isSidePanelOpen}
        onClose={() => setIsSidePanelOpen(false)}
        onUpdate={onUpdate}
        onDelete={onDelete}
      />
    </>
  );
}
