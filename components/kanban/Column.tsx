import { ColumnId, Card, Priority } from '@/lib/kanban/types';
import { CardItem } from './CardItem';
import { Button } from '@/components/ui/button';
import { Plus, GripVertical } from 'lucide-react';
import { useState, useEffect } from 'react';
import { createCard } from '@/lib/kanban/storage';
import { useSortable } from '@dnd-kit/sortable';
import { useDroppable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';

function SortableCard({ card, attachments, onUpdate, onDelete }: {
  card: Card;
  attachments: Record<string, any>;
  onUpdate: (card: Card) => void;
  onDelete: (cardId: string) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: card.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  // Remove aria-describedby to prevent hydration mismatch
  const { 'aria-describedby': _, ...cleanAttributes } = attributes;

  return (
    <div ref={setNodeRef} style={style} {...cleanAttributes}>
      <CardItem
        card={card}
        attachments={attachments}
        onUpdate={onUpdate}
        onDelete={onDelete}
        dragHandleProps={listeners}
      />
    </div>
  );
}

interface ColumnProps {
  columnId: ColumnId;
  title: string;
  cards: Card[];
  attachments: Record<string, any>;
  onUpdateCard: (card: Card) => void;
  onDeleteCard: (cardId: string) => void;
  onAddCard: (card: Card, columnId: ColumnId) => void;
}

export function Column({ 
  columnId, 
  title, 
  cards, 
  attachments, 
  onUpdateCard, 
  onDeleteCard, 
  onAddCard 
}: ColumnProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newPriority, setNewPriority] = useState<Priority>('None');

  const { setNodeRef, isOver } = useDroppable({
    id: columnId,
  });

  const handleAddCard = () => {
    if (!newTitle.trim()) return;
    
    const card = createCard(newTitle.trim(), newDescription.trim(), newPriority, columnId);
    onAddCard(card, columnId);
    
    setNewTitle('');
    setNewDescription('');
    setNewPriority('Medium');
    setShowAddForm(false);
  };

  return (
    <div 
      ref={setNodeRef}
      className={`bg-gray-50 rounded-lg p-4 min-h-[500px] transition-colors ${
        isOver ? 'bg-blue-50 border-2 border-blue-300' : ''
      }`}
    >
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-lg">{title}</h2>
        <span className="text-sm text-gray-500 bg-white px-2 py-1 rounded">
          {cards.length}
        </span>
      </div>
      
      <div className="space-y-3">
        {cards.map((card) => (
          <SortableCard
            key={card.id}
            card={card}
            attachments={attachments}
            onUpdate={onUpdateCard}
            onDelete={onDeleteCard}
          />
        ))}
        
        {showAddForm ? (
          <div className="bg-white p-3 rounded-lg border-2 border-dashed border-gray-300">
            <div className="space-y-3">
              <input
                type="text"
                placeholder="Card title"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                className="w-full px-3 py-2 border rounded-md text-sm"
                autoFocus
              />
              <textarea
                placeholder="Description (optional)"
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                className="w-full px-3 py-2 border rounded-md text-sm"
                rows={2}
              />
              <select
                value={newPriority}
                onChange={(e) => setNewPriority(e.target.value as Priority)}
                className="w-full px-3 py-2 border rounded-md text-sm"
              >
                <option value="Critical">Critical</option>
                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
                <option value="V2">V2</option>
                <option value="None">None</option>
              </select>
              <div className="flex gap-2">
                <Button size="sm" onClick={handleAddCard}>
                  Add Card
                </Button>
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={() => setShowAddForm(false)}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <Button
            variant="ghost"
            className="w-full justify-start text-gray-500 hover:text-gray-700"
            onClick={() => setShowAddForm(true)}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add a card
          </Button>
        )}
      </div>
    </div>
  );
}
