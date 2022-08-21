import React, { forwardRef, useState } from 'react';
import {
    closestCenter,
    DndContext,
    DragOverlay,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import entries from './entries1.json';
import { SortableApp } from './SortableApp';

type Props = {
    cat: string;
    idx: number;
    style: any;
};
type Ref = HTMLButtonElement;

export const Card = forwardRef<Ref, Props>(
    ({ cat, idx, style, ...props }, ref) => {
        const [apps, setApps] = useState(entries[cat as keyof typeof entries]);
        const [activeId, setActiveId] = useState(null);
        const sensors = useSensors(
            useSensor(PointerSensor),
            useSensor(KeyboardSensor, {
                coordinateGetter: sortableKeyboardCoordinates,
            })
        );

        function handleDragStart(event: { active: any }) {
            const { active } = event;

            setActiveId(active.id);
        }

        function handleDragEnd(event: { active: any; over: any }) {
            const { active, over } = event;

            if (active.id !== over.id) {
                setApps((apps) => {
                    const oldIndex = apps.indexOf(active.id);
                    const newIndex = apps.indexOf(over.id);

                    return arrayMove(apps, oldIndex, newIndex);
                });
            }

            setActiveId(null);
        }
        const inlineStyles = {
            ...style,
        };

        return (
            <div
                ref={ref}
                {...props}
                style={inlineStyles}
                className="card edit_mode"
            >
                <div className="card_title">{cat}</div>
                <div className="card_content">
                    {/* {entries[cat as keyof typeof entries].map((app, idx) => (
                        <div className="card_item" key={app.name}>
                            {app.name}
                        </div>
                    ))} */}
                    <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragStart={handleDragStart}
                        // onDragOver={handleDragOver}
                        onDragEnd={handleDragEnd}
                    >
                        <SortableContext
                            items={apps}
                            strategy={verticalListSortingStrategy}
                        >
                            {apps.map((app, idx) => (
                                <SortableApp
                                    idx={idx}
                                    key={cat + app}
                                    app={app}
                                />
                            ))}
                        </SortableContext>
                        <DragOverlay adjustScale={true}>
                            {activeId ? (
                                <div className="card_item">{activeId}</div>
                            ) : null}
                        </DragOverlay>
                    </DndContext>
                </div>
            </div>
        );
    }
);
