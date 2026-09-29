import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { Station } from '../../types/route';

interface StationListProps {
  stations: Station[];
  onChange: (stations: Station[]) => void;
}

interface SortableStationProps {
  station: Station;
  onRemove: (stationId: string) => void;
}

function SortableStation({
  station,
  onRemove,
}: SortableStationProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({
    id: station.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="station-item"
    >
      <button
        type="button"
        className="drag-handle"
        {...attributes}
        {...listeners}
        aria-label={`Kéo trạm ${station.name}`}
      >
        ☰
      </button>

      <div className="station-order">
        {station.order}
      </div>

      <div className="station-info">
        <strong>{station.name}</strong>
        <span>{station.address}</span>
      </div>

      <button
        type="button"
        className="station-delete"
        onClick={() => onRemove(station.id)}
      >
        Xóa
      </button>
    </div>
  );
}

function StationList({
  stations,
  onChange,
}: StationListProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) {
      return;
    }

    const oldIndex = stations.findIndex(
      (station) => station.id === active.id,
    );

    const newIndex = stations.findIndex(
      (station) => station.id === over.id,
    );

    if (oldIndex === -1 || newIndex === -1) {
      return;
    }

    const reorderedStations = arrayMove(
      stations,
      oldIndex,
      newIndex,
    ).map((station, index) => ({
      ...station,
      order: index + 1,
    }));

    onChange(reorderedStations);
  };

  const handleRemove = (stationId: string) => {
    const updatedStations = stations
      .filter((station) => station.id !== stationId)
      .map((station, index) => ({
        ...station,
        order: index + 1,
      }));

    onChange(updatedStations);
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={(Array.isArray(stations) ? stations : []).map((station) => station.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="station-list">
          {(Array.isArray(stations) ? stations : []).map((station) => (
            <SortableStation
              key={station.id}
              station={station}
              onRemove={handleRemove}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}

export default StationList;