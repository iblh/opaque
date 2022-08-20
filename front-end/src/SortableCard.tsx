import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card } from './Card';

export function SortableCard(props: any) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: props.cat });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        // border: isDragging ? '1px dashed red' : '1px solid transparent',
        // zIndex: isDragging ? "100" : "auto",
        opacity: isDragging ? 0.3 : 1,
    };

    return (
        <Card
            ref={setNodeRef}
            style={style}
            {...props}
            {...attributes}
            {...listeners}
        />
    );
}
