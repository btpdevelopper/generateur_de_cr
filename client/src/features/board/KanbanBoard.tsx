import { useMemo, useState } from "react";
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
  useDraggable,
  useDroppable,
  DragOverlay,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import type { Ftm, Lot } from "../../types/models";
import { kanbanColumns, columnIndexForStatus } from "../../lib/constants";
import FtmCard from "./FtmCard";

interface KanbanBoardProps {
  ftms: Ftm[];
  lots: Lot[];
  onOpenFtm: (ftm: Ftm) => void;
  /** Called when a card is dropped in a column whose target status differs. */
  onMoveFtm: (ftm: Ftm, newStatus: string) => void;
}

/** The status assigned to a card dropped in a column. */
function columnTargetStatus(colIndex: number): string {
  const col = kanbanColumns[colIndex];
  return col.status || (col.statuses ? col.statuses[0] : "");
}

function DraggableCard({
  ftm,
  lots,
  onOpen,
}: {
  ftm: Ftm;
  lots: Lot[];
  onOpen: (ftm: Ftm) => void;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: ftm.id,
  });
  return (
    <div ref={setNodeRef} className={isDragging ? "opacity-40" : ""}>
      <FtmCard
        ftm={ftm}
        lots={lots}
        onOpen={onOpen}
        dragHandleProps={{ ...listeners, ...attributes }}
      />
    </div>
  );
}

function Column({
  index,
  ftms,
  lots,
  onOpenFtm,
}: {
  index: number;
  ftms: Ftm[];
  lots: Lot[];
  onOpenFtm: (ftm: Ftm) => void;
}) {
  const col = kanbanColumns[index];
  const { setNodeRef, isOver } = useDroppable({ id: `col-${index}` });

  return (
    <div className="flex w-80 flex-shrink-0 flex-col md:w-96">
      <div
        className={`flex items-center justify-between rounded-t-lg p-3 ${col.headerColor}`}
      >
        <div className="flex items-center">
          <span className={`mr-3 h-2.5 w-2.5 rounded-full ${col.color}`} />
          <h2 className={`font-bold ${col.textColor}`}>{col.title}</h2>
        </div>
        <span className="rounded-full bg-white px-2.5 py-1 text-sm font-semibold text-gray-600 shadow-sm">
          {ftms.length}
        </span>
      </div>
      <div
        ref={setNodeRef}
        className={`custom-scrollbar min-h-[120px] space-y-4 overflow-y-auto rounded-b-lg pt-3 transition-colors ${
          isOver ? "bg-indigo-50/60" : "bg-transparent"
        }`}
      >
        {ftms.length > 0 ? (
          ftms.map((ftm) => (
            <DraggableCard
              key={ftm.id}
              ftm={ftm}
              lots={lots}
              onOpen={onOpenFtm}
            />
          ))
        ) : (
          <div className="rounded-lg bg-gray-50 px-4 py-8 text-center text-sm text-gray-500">
            Glissez une carte ici
          </div>
        )}
      </div>
    </div>
  );
}

export default function KanbanBoard({
  ftms,
  lots,
  onOpenFtm,
  onMoveFtm,
}: KanbanBoardProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  // Group FTMs by column index.
  const columns = useMemo(() => {
    const groups: Ftm[][] = kanbanColumns.map(() => []);
    for (const ftm of ftms) {
      groups[columnIndexForStatus(ftm.status)].push(ftm);
    }
    return groups;
  }, [ftms]);

  const totalFtms = ftms.length;
  const activeFtm = activeId ? ftms.find((f) => f.id === activeId) : null;

  const handleDragStart = (e: DragStartEvent) => {
    setActiveId(String(e.active.id));
  };

  const handleDragEnd = (e: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = e;
    if (!over) return;
    const overId = String(over.id);
    if (!overId.startsWith("col-")) return;
    const targetCol = parseInt(overId.replace("col-", ""), 10);
    const ftm = ftms.find((f) => f.id === String(active.id));
    if (!ftm) return;
    const currentCol = columnIndexForStatus(ftm.status);
    if (currentCol === targetCol) return;
    const newStatus = columnTargetStatus(targetCol);
    if (newStatus && newStatus !== ftm.status) onMoveFtm(ftm, newStatus);
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={() => setActiveId(null)}
    >
      {/* Stats bar */}
      {totalFtms > 0 && (
        <div className="px-4 pt-4 md:px-6">
          <div className="flex flex-wrap gap-4">
            {kanbanColumns.map((col, i) => {
              const pct = totalFtms ? (columns[i].length / totalFtms) * 100 : 0;
              return (
                <div
                  key={col.title}
                  className="min-w-[150px] flex-1 rounded-lg border border-gray-200/80 bg-white p-3 shadow-sm"
                >
                  <div className="mb-1 flex items-center justify-between">
                    <span className="text-sm font-semibold text-gray-600">
                      {col.title}
                    </span>
                    <span className={`text-sm font-bold ${col.textColor}`}>
                      {pct.toFixed(0)}%
                    </span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-gray-200">
                    <div
                      className={`h-1.5 rounded-full ${col.color}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="flex h-full flex-grow gap-x-6 overflow-x-auto p-4 md:p-6">
        {kanbanColumns.map((_, i) => (
          <Column
            key={i}
            index={i}
            ftms={columns[i]}
            lots={lots}
            onOpenFtm={onOpenFtm}
          />
        ))}
      </div>

      <DragOverlay>
        {activeFtm ? (
          <div className="w-80 rotate-2 md:w-96">
            <FtmCard ftm={activeFtm} lots={lots} onOpen={() => {}} />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
