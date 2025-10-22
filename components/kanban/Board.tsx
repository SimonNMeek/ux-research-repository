'use client';

import { useState, useEffect, useMemo } from 'react';
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { BoardState, Card, ColumnId, Priority, Attachment, SortOption } from '@/lib/kanban/types';
import { loadBoardState, saveBoardState, clearBoardState, createCard } from '@/lib/kanban/storage';
import { createSeedBoard } from '@/lib/kanban/seed';
import { toCSV, downloadFile } from '@/lib/kanban/csv';
import { Column } from './Column';
import { CardItem } from './CardItem';
import { Toolbar } from './Toolbar';
import { ImportDialog } from './ImportDialog';

export function Board() {
  const [boardState, setBoardState] = useState<BoardState>(createSeedBoard());
  const [searchQuery, setSearchQuery] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<Priority[]>([]);
  const [sortOption, setSortOption] = useState<SortOption>('priority');
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [activeCard, setActiveCard] = useState<Card | null>(null);

  // Load board state on mount
  useEffect(() => {
    const loadData = async () => {
      const saved = await loadBoardState();
      if (saved) {
        setBoardState(saved);
      }
    };
    loadData();
  }, []);

  // Save board state whenever it changes
  useEffect(() => {
    saveBoardState(boardState);
  }, [boardState]);

  // Filter cards based on search and priority
  const filteredCards = useMemo(() => {
    return Object.values(boardState.cards).filter(card => {
      const matchesSearch = !searchQuery || 
        card.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        card.description.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesPriority = priorityFilter.length === 0 || 
        priorityFilter.includes(card.priority);
      
      return matchesSearch && matchesPriority;
    });
  }, [boardState.cards, searchQuery, priorityFilter]);

  // Group filtered cards by column and sort them
  const cardsByColumn = useMemo(() => {
    const grouped: Record<ColumnId, Card[]> = {
      todo: [],
      progress: [],
      complete: [],
    };

    filteredCards.forEach(card => {
      // Find which column this card belongs to
      Object.values(boardState.columns).forEach(column => {
        if (column.cardIds.includes(card.id)) {
          grouped[column.id].push(card);
        }
      });
    });

    // Sort cards in each column based on sort option
    Object.keys(grouped).forEach(columnId => {
      grouped[columnId as ColumnId].sort((a, b) => {
        if (sortOption === 'priority') {
          const priorityOrder = { Critical: 0, High: 1, Medium: 2, Low: 3, V2: 4, None: 5 };
          return priorityOrder[a.priority] - priorityOrder[b.priority];
        } else {
          // Sort by date added (newest first)
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        }
      });
    });

    return grouped;
  }, [filteredCards, boardState.columns, sortOption]);

  const handleUpdateCard = (updatedCard: Card) => {
    setBoardState(prev => ({
      ...prev,
      cards: {
        ...prev.cards,
        [updatedCard.id]: updatedCard,
      },
    }));
  };

  const handleDeleteCard = (cardId: string) => {
    setBoardState(prev => {
      const newCards = { ...prev.cards };
      delete newCards[cardId];

      const newColumns = { ...prev.columns };
      Object.values(newColumns).forEach(column => {
        column.cardIds = column.cardIds.filter(id => id !== cardId);
      });

      return {
        ...prev,
        cards: newCards,
        columns: newColumns,
      };
    });
  };

  const handleAddCard = (card: Card, columnId: ColumnId) => {
    setBoardState(prev => ({
      ...prev,
      cards: {
        ...prev.cards,
        [card.id]: card,
      },
      columns: {
        ...prev.columns,
        [columnId]: {
          ...prev.columns[columnId],
          cardIds: [...prev.columns[columnId].cardIds, card.id],
        },
      },
    }));
  };

  const handleDragStart = (event: DragStartEvent) => {
    const cardId = event.active.id as string;
    const card = boardState.cards[cardId];
    setActiveCard(card);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveCard(null);

    if (!over) return;

    const cardId = active.id as string;
    
    // Find current column
    let currentColumnId: ColumnId | null = null;
    Object.values(boardState.columns).forEach(column => {
      if (column.cardIds.includes(cardId)) {
        currentColumnId = column.id;
      }
    });

    if (!currentColumnId) return;

    // Determine target column
    let newColumnId: ColumnId;
    
    // Check if over.id is a valid column ID
    if (boardState.columns[over.id as ColumnId]) {
      newColumnId = over.id as ColumnId;
    } else {
      // If over.id is a card ID, find which column it belongs to
      let targetColumnId: ColumnId | null = null;
      Object.values(boardState.columns).forEach(column => {
        if (column.cardIds.includes(over.id as string)) {
          targetColumnId = column.id;
        }
      });
      
      if (!targetColumnId) return;
      newColumnId = targetColumnId;
    }

    if (currentColumnId === newColumnId) return;

    // Move card to new column
    setBoardState(prev => {
      const newColumns = { ...prev.columns };
      
      // Remove from current column
      newColumns[currentColumnId!].cardIds = newColumns[currentColumnId!].cardIds.filter(id => id !== cardId);
      
      // Add to new column
      newColumns[newColumnId].cardIds.push(cardId);

      return {
        ...prev,
        columns: newColumns,
      };
    });
  };

  const handleImport = (cards: Card[], attachments: Attachment[], cardColumns: Record<string, ColumnId>) => {
    setBoardState(prev => {
      const newCards = { ...prev.cards };
      const newAttachments = { ...prev.attachments };
      const newColumns = { ...prev.columns };

      cards.forEach(card => {
        newCards[card.id] = card;
        
        // Get the target column for this card from the CSV data
        const targetColumnId = cardColumns[card.id] || 'todo';
        
        // Add the card to the correct column
        if (!newColumns[targetColumnId].cardIds.includes(card.id)) {
          newColumns[targetColumnId].cardIds.push(card.id);
        }
      });

      attachments.forEach(attachment => {
        newAttachments[attachment.id] = attachment;
      });

      return {
        ...prev,
        cards: newCards,
        attachments: newAttachments,
        columns: newColumns,
      };
    });
  };

  const handleExportJSON = () => {
    const json = JSON.stringify(boardState, null, 2);
    downloadFile(json, 'kanban-board.json', 'application/json');
  };

  const handleExportCSV = () => {
    const csv = toCSV(boardState);
    downloadFile(csv, 'kanban-board.csv', 'text/csv');
  };

  const handleReset = () => {
    if (confirm('Are you sure you want to reset the board? This will delete all data.')) {
      clearBoardState();
      setBoardState(createSeedBoard());
      setSearchQuery('');
      setPriorityFilter([]);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <Toolbar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        priorityFilter={priorityFilter}
        onPriorityFilterChange={setPriorityFilter}
        sortOption={sortOption}
        onSortChange={setSortOption}
        onImport={() => setShowImportDialog(true)}
        onExportJSON={handleExportJSON}
        onExportCSV={handleExportCSV}
        onReset={handleReset}
      />
      
      <DndContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {Object.values(boardState.columns).map(column => (
              <SortableContext
                key={column.id}
                items={cardsByColumn[column.id].map(card => card.id)}
                strategy={verticalListSortingStrategy}
              >
                <Column
                  columnId={column.id}
                  title={column.title}
                  cards={cardsByColumn[column.id]}
                  attachments={boardState.attachments}
                  onUpdateCard={handleUpdateCard}
                  onDeleteCard={handleDeleteCard}
                  onAddCard={handleAddCard}
                />
              </SortableContext>
            ))}
          </div>
        </div>
        
        <DragOverlay>
          {activeCard ? (
            <div className="opacity-50">
              <CardItem
                card={activeCard}
                attachments={boardState.attachments}
                onUpdate={handleUpdateCard}
                onDelete={handleDeleteCard}
              />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
      
      <ImportDialog
        isOpen={showImportDialog}
        onClose={() => setShowImportDialog(false)}
        onImport={handleImport}
      />
    </div>
  );
}
